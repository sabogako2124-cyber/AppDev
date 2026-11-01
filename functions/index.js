const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {initializeApp} = require("firebase-admin/app");
const {getAuth} = require("firebase-admin/auth");
const {
  getFirestore,
  Timestamp,
  FieldValue,
} = require("firebase-admin/firestore");

initializeApp();

const db = getFirestore();
const adminAuth = getAuth();

const DEFAULT_SCHEDULE = {
  Monday: {open: true, openingTime: "09:00", closingTime: "18:00"},
  Tuesday: {open: true, openingTime: "09:00", closingTime: "18:00"},
  Wednesday: {open: true, openingTime: "09:00", closingTime: "18:00"},
  Thursday: {open: true, openingTime: "09:00", closingTime: "18:00"},
  Friday: {open: true, openingTime: "09:00", closingTime: "18:00"},
  Saturday: {open: true, openingTime: "09:00", closingTime: "18:00"},
  Sunday: {open: false, openingTime: "09:00", closingTime: "18:00"},
};

exports.registerOwner = onCall(async (request) => {
  const {
    code,
    name,
    email,
    password,
    shopName,
    shopAddress,
    contactNumber,
    shopType,
  } = request.data || {};

  if (
    !code ||
    !name ||
    !email ||
    !password ||
    !shopName ||
    !shopAddress ||
    !contactNumber ||
    !shopType
  ) {
    throw new HttpsError(
        "invalid-argument",
        "Please complete all registration fields.",
    );
  }

  if (typeof password !== "string" || password.length < 6) {
    throw new HttpsError(
        "invalid-argument",
        "Password must contain at least 6 characters.",
    );
  }

  const cleanCode = String(code).trim().toUpperCase();
  const cleanEmail = String(email).trim().toLowerCase();

  let codeRef;
  let uid;
  let reserved = false;
  let accountCreated = false;

  try {
    await db.runTransaction(async (transaction) => {
      const querySnapshot = await transaction.get(
          db.collection("verificationCodes")
              .where("code", "==", cleanCode)
              .limit(1),
      );

      if (querySnapshot.empty) {
        throw new HttpsError("not-found", "Invalid verification code.");
      }

      const codeDoc = querySnapshot.docs[0];
      const codeData = codeDoc.data();

      if (codeData.used === true || codeData.status === "used") {
        throw new HttpsError(
            "already-exists",
            "This verification code has already been used.",
        );
      }

      if (
        !codeData.expiresAt ||
        codeData.expiresAt.toMillis() <= Date.now()
      ) {
        throw new HttpsError(
            "deadline-exceeded",
            "This verification code has expired.",
        );
      }

      if (codeData.status === "pending") {
        throw new HttpsError(
            "aborted",
            "This verification code is currently being used. Try again later.",
        );
      }

      codeRef = codeDoc.ref;

      transaction.update(codeRef, {
        status: "pending",
        reservedAt: Timestamp.now(),
      });

      reserved = true;
    });

    const userRecord = await adminAuth.createUser({
      email: cleanEmail,
      password,
      displayName: String(name).trim(),
    });

    uid = userRecord.uid;
    accountCreated = true;

    const userData = {
      uid,
      name: String(name).trim(),
      email: cleanEmail,
      role: "owner",
      status: "active",
      createdAt: FieldValue.serverTimestamp(),
    };

    const shopData = {
      establishmentId: uid,
      ownerId: uid,
      ownerName: String(name).trim(),
      name: String(shopName).trim(),
      address: String(shopAddress).trim(),
      contactNumber: String(contactNumber).trim(),
      type: String(shopType),
      status: "active",
      operatingHours: DEFAULT_SCHEDULE,
      createdAt: FieldValue.serverTimestamp(),
    };

    const batch = db.batch();

    batch.set(db.collection("users").doc(uid), userData);
    batch.set(db.collection("establishments").doc(uid), shopData);

    await batch.commit();

    await db.runTransaction(async (transaction) => {
      const latestCode = await transaction.get(codeRef);

      if (!latestCode.exists || latestCode.data().status !== "pending") {
        throw new HttpsError(
            "aborted",
            "Verification reservation could not be completed.",
        );
      }

      transaction.update(codeRef, {
        used: true,
        status: "used",
        usedAt: Timestamp.now(),
      });
    });

    return {
      success: true,
      uid,
      message: "Owner account created successfully.",
    };
  } catch (error) {
    console.error("Owner registration error:", error);

    if (uid && accountCreated) {
      try {
        await adminAuth.deleteUser(uid);
      } catch (cleanupError) {
        console.error("Auth cleanup error:", cleanupError);
      }

      try {
        const batch = db.batch();
        batch.delete(db.collection("users").doc(uid));
        batch.delete(db.collection("establishments").doc(uid));
        await batch.commit();
      } catch (cleanupError) {
        console.error("Firestore cleanup error:", cleanupError);
      }
    }

    if (reserved && codeRef) {
      try {
        await db.runTransaction(async (transaction) => {
          const latestCode = await transaction.get(codeRef);

          if (
            latestCode.exists &&
            latestCode.data().status === "pending"
          ) {
            transaction.update(codeRef, {
              status: "available",
              reservedAt: FieldValue.delete(),
            });
          }
        });
      } catch (cleanupError) {
        console.error("Code cleanup error:", cleanupError);
      }
    }

    if (error instanceof HttpsError) {
      throw error;
    }

    if (error.code === "auth/email-already-exists") {
      throw new HttpsError(
          "already-exists",
          "This email is already registered.",
      );
    }

    throw new HttpsError(
        "internal",
        "Owner registration failed. Please try again.",
    );
  }
});
