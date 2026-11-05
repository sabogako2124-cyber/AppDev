import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Linking,
  KeyboardAvoidingView,
  Platform,
  ImageBackground
} from "react-native";

import DateTimePicker from "@react-native-community/datetimepicker";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut
} from "firebase/auth";

import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  addDoc,
  runTransaction
} from "firebase/firestore";

import { auth, db } from "./firebase";

const DAYS = [
  "Monday", "Tuesday", "Wednesday", "Thursday",
  "Friday", "Saturday", "Sunday"
];

const WEEKDAYS = [
  "Sunday", "Monday", "Tuesday", "Wednesday",
  "Thursday", "Friday", "Saturday"
];

const DEFAULT_SCHEDULE = Object.fromEntries(
  DAYS.map(day => [
    day,
    {
      open: day !== "Sunday",
      openingTime: "09:00",
      closingTime: "18:00"
    }
  ])
);

const DEMO_SHOPS = [
  {
    id: "demo_shop_1",
    isDemo: true,
    name: "Classic Cuts Barbershop",
    type: "Barbershop",
    address: "BGC, Taguig City",
    contactNumber: "0917 000 1001",
    operatingHours: DEFAULT_SCHEDULE,
    services: [
      { id: "demo_service_1", name: "Classic Haircut", description: "Clean and classic haircut.", price: 120, durationMinutes: 30 },
      { id: "demo_service_2", name: "Fade Haircut", description: "Modern fade haircut.", price: 180, durationMinutes: 45 },
      { id: "demo_service_3", name: "Haircut and Shampoo", description: "Haircut with shampoo service.", price: 200, durationMinutes: 45 }
    ]
  },
  {
    id: "demo_shop_2",
    isDemo: true,
    name: "The Gentleman's Lounge",
    type: "Barbershop",
    address: "Market! Market!, Taguig City",
    contactNumber: "0917 000 1002",
    operatingHours: DEFAULT_SCHEDULE,
    services: [
      { id: "demo_service_4", name: "Premium Haircut", description: "Professional haircut service.", price: 250, durationMinutes: 45 },
      { id: "demo_service_5", name: "Beard Trim", description: "Neat beard trimming.", price: 100, durationMinutes: 30 }
    ]
  },
  {
    id: "demo_shop_3",
    isDemo: true,
    name: "Urban Style Salon",
    type: "Salon",
    address: "Venice Grand Canal, Taguig City",
    contactNumber: "0917 000 1003",
    operatingHours: DEFAULT_SCHEDULE,
    services: [
      { id: "demo_service_6", name: "Haircut", description: "Basic haircut for all styles.", price: 180, durationMinutes: 45 },
      { id: "demo_service_7", name: "Hair Treatment", description: "Sample hair treatment service.", price: 350, durationMinutes: 60 },
      { id: "demo_service_8", name: "Hair Coloring", description: "Sample hair coloring service.", price: 600, durationMinutes: 90 }
    ]
  },
  {
    id: "demo_shop_4",
    isDemo: true,
    name: "Beauty Bloom Salon",
    type: "Salon",
    address: "Bonifacio High Street, Taguig City",
    contactNumber: "0917 000 1004",
    operatingHours: DEFAULT_SCHEDULE,
    services: [
      { id: "demo_service_9", name: "Women's Haircut", description: "Professional haircut service.", price: 250, durationMinutes: 45 },
      { id: "demo_service_10", name: "Hair Spa", description: "Relaxing hair spa service.", price: 400, durationMinutes: 60 }
    ]
  },
  {
    id: "demo_shop_5",
    isDemo: true,
    name: "Fresh Look Barbershop",
    type: "Barbershop",
    address: "Pinagsama, Taguig City",
    contactNumber: "0917 000 1005",
    operatingHours: DEFAULT_SCHEDULE,
    services: [
      { id: "demo_service_11", name: "Regular Haircut", description: "Simple and clean haircut.", price: 100, durationMinutes: 30 },
      { id: "demo_service_12", name: "Kids Haircut", description: "Haircut for kids.", price: 100, durationMinutes: 30 }
    ]
  },
  {
    id: "demo_shop_6",
    isDemo: true,
    name: "Glamour Hair Studio",
    type: "Salon",
    address: "McKinley Hill, Taguig City",
    contactNumber: "0917 000 1006",
    operatingHours: DEFAULT_SCHEDULE,
    services: [
      { id: "demo_service_13", name: "Hair Styling", description: "Everyday hair styling.", price: 300, durationMinutes: 45 },
      { id: "demo_service_14", name: "Hair Rebond", description: "Sample hair rebond service.", price: 1500, durationMinutes: 180 }
    ]
  }
];

const formatDate = d =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const dateFromString = s =>
  s ? new Date(`${s}T12:00:00`) : new Date();

const formatTime = s => {
  if (!s || !/^\d{2}:\d{2}$/.test(s)) return s || "";
  const [h, m] = s.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

const makeSlotLockId = (shopId, date, time) =>
  `${shopId}_${date}_${time}`;

const makeSlotLockTimes = (startTime, durationMinutes) => {
  const [hour, minute] = startTime.split(":").map(Number);
  const start = hour * 60 + minute;
  const duration = Math.max(30, Number(durationMinutes) || 30);
  const times = [];

  for (let offset = 0; offset < duration; offset += 30) {
    const totalMinutes = start + offset;
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    times.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }

  return times;
};

export default function App() {
  const [screen, setScreen] = useState("login");
  const [shopSearch, setShopSearch] = useState("");
  const [shopTypeFilter, setShopTypeFilter] = useState("All");

  const [serviceDescription, setServiceDescription] = useState("");

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [shopName, setShopName] = useState("");
  const [shopAddress, setShopAddress] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [shopType, setShopType] = useState("Barbershop");
  
  const [regTypeDropdownOpen, setRegTypeDropdownOpen] = useState(false);
  const [showAboutUs, setShowAboutUs] = useState(false);
  const [showOwnerAboutUs, setShowOwnerAboutUs] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingShops, setLoadingShops] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingCustomerServices, setLoadingCustomerServices] = useState(false);

  const [currentUser, setCurrentUser] = useState(null);
  const [establishment, setEstablishment] = useState(null);
  const [shops, setShops] = useState([]);

  const [services, setServices] = useState([]);
  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceDuration, setServiceDuration] = useState("30");
  const [editingServiceId, setEditingServiceId] = useState(null);

  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleDay, setScheduleDay] = useState("Monday");
  const [timePickerField, setTimePickerField] = useState("openingTime");
  const [timePickerVisible, setTimePickerVisible] = useState(false);

  const [selectedShop, setSelectedShop] = useState(null);
  const [customerServices, setCustomerServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);

  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [occupiedSlots, setOccupiedSlots] = useState([]);

  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  const [myAppointments, setMyAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [appointmentFilter, setAppointmentFilter] = useState("All");

  const appointmentSummary = {
    total: myAppointments.length,
    upcoming: myAppointments.filter(item => ["pending", "confirmed"].includes((item.status || "pending").toLowerCase())).length,
    inProgress: myAppointments.filter(item => ["inqueue", "inservice"].includes((item.status || "").toLowerCase())).length,
    completed: myAppointments.filter(item => (item.status || "").toLowerCase() === "completed").length,
    cancelled: myAppointments.filter(item => (item.status || "").toLowerCase() === "cancelled").length
  };

  const filteredMyAppointments = myAppointments.filter(item => {
    const status = (item.status || "pending").toLowerCase();
    if (appointmentFilter === "Upcoming") return ["pending", "confirmed"].includes(status);
    if (appointmentFilter === "In Progress") return ["inqueue", "inservice"].includes(status);
    if (appointmentFilter === "Completed") return status === "completed";
    if (appointmentFilter === "Cancelled") return status === "cancelled";
    return true;
  });

  const [ownerAppointments, setOwnerAppointments] = useState([]);
  const [loadingOwnerAppointments, setLoadingOwnerAppointments] = useState(false);
  const [confirmingAppointmentId, setConfirmingAppointmentId] = useState(null);

  const [queueAppointments, setQueueAppointments] = useState([]);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [updatingQueueId, setUpdatingQueueId] = useState(null);

  const filteredShops = shops.filter(shop => {
    const search = shopSearch.toLowerCase();
    const matchesSearch = (shop.name || "").toLowerCase().includes(search) || (shop.address || "").toLowerCase().includes(search);
    const type = (shop.type || "").toLowerCase();
    const matchesType = shopTypeFilter === "All" || type.includes(shopTypeFilter.toLowerCase());
    return matchesSearch && matchesType;
  });

  function clearPasswords() {
    setPassword("");
    setConfirmPassword("");
  }

  function goTo(next) {
    clearPasswords();
    setScreen(next);
  }

  function validateRegistration() {
    if (!name.trim()) {
      Alert.alert("Required", "Enter your full name.");
      return false;
    }
    if (!email.trim() || !email.includes("@")) {
      Alert.alert("Invalid Email", "Enter a valid email.");
      return false;
    }
    if (password.length < 6 || !/[A-Z]/.test(password)) {
      Alert.alert("Invalid Password", "Use at least 6 characters and one capital letter.");
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert("Password Mismatch", "Passwords do not match.");
      return false;
    }
    return true;
  }

  async function handleCustomerRegister() {
    if (!validateRegistration()) return;
    if (!age.trim() || !Number.isInteger(Number(age)) || Number(age) < 15) {
      Alert.alert("Invalid Age", "Enter an age of 15 or older.");
      return;
    }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(cred.user, { displayName: name.trim() });
      await setDoc(doc(db, "users", cred.user.uid), {
        uid: cred.user.uid,
        name: name.trim(),
        age: Number(age),
        email: email.trim(),
        role: "customer",
        status: "active",
        createdAt: serverTimestamp()
      });
      await signOut(auth);
      clearPasswords();
      setScreen("login");
      Alert.alert("Success", "Customer account created. You can now sign in.");
    } catch (e) {
      Alert.alert("Registration Failed", e.code === "auth/email-already-in-use" ? "This email is already registered." : e.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleOwnerRegister() {
    if (!validateRegistration()) return;
    if (!shopName.trim() || !shopAddress.trim() || !contactNumber.trim()) {
      Alert.alert("Required", "Complete the shop details.");
      return;
    }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(cred.user, { displayName: name.trim() });
      await setDoc(doc(db, "users", cred.user.uid), {
        uid: cred.user.uid,
        name: name.trim(),
        email: email.trim(),
        role: "owner",
        status: "pending",
        pendingShop: {
          name: shopName.trim(),
          address: shopAddress.trim(),
          contactNumber: contactNumber.trim(),
          type: shopType,
          operatingHours: DEFAULT_SCHEDULE
        },
        createdAt: serverTimestamp()
      });
      await signOut(auth);
      clearPasswords();
      setScreen("login");
      Alert.alert("Registration Submitted", "Your owner account is pending admin approval.");
    } catch (e) {
      if (auth.currentUser) {
        try { await signOut(auth); } catch (signOutError) {}
      }
      Alert.alert("Registration Failed", e.code === "auth/email-already-in-use" ? "This email is already registered." : e.message || "Please check your information and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert("Required", "Enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const snap = await getDoc(doc(db, "users", cred.user.uid));
      if (!snap.exists()) {
        await signOut(auth);
        Alert.alert("Profile Not Found", "Your user profile was not found.");
        return;
      }
      const data = snap.data();
      if (data.status !== "active") {
        await signOut(auth);
        if (data.role === "owner" && data.status === "pending") {
          Alert.alert("Pending Admin Approval", "Your owner account is waiting for admin approval.");
        } else {
          Alert.alert("Account Disabled", "Your account is not active.");
        }
        return;
      }
      const signedUser = { ...data, uid: cred.user.uid };
      if (data.role === "customer") {
        setCurrentUser(signedUser);
        setScreen("customerDashboard");
        await handleLoadHomeShops();
      } else if (data.role === "owner") {
        const shopSnap = await getDoc(doc(db, "establishments", cred.user.uid));
        if (!shopSnap.exists()) {
          await signOut(auth);
          Alert.alert("Shop Not Found", "Shop record not found.");
          return;
        }
        const shop = shopSnap.data();
        setCurrentUser(signedUser);
        setEstablishment(shop);
        setSchedule(shop.operatingHours || DEFAULT_SCHEDULE);
        setScreen("ownerDashboard");
      } else {
        await signOut(auth);
        Alert.alert("Access Denied", "Unsupported account role.");
        return;
      }
      clearPasswords();
    } catch (e) {
      Alert.alert("Login Failed", `${e.code || ""}: ${e.message || "Please try again."}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setEstablishment(null);
      setShops([]);
      setSelectedShop(null);
      setCustomerServices([]);
      setServices([]);
      setSelectedService(null);
      setAppointmentDate("");
      setAppointmentTime("");
      setAvailableSlots([]);
      setOccupiedSlots([]);
      setMyAppointments([]);
      setEmail("");
      clearPasswords();
      setScreen("login");
    } catch (e) {
      Alert.alert("Error", "Unable to log out.");
    }
  }

  function handleViewAppointmentDetails(item) {
    setSelectedAppointment(item);
    if (currentUser?.role === "owner") {
      setScreen("ownerAppointmentDetails");
    } else {
      setScreen("appointmentDetails");
    }
  }

  async function handleLoadMyAppointments() {
    if (!currentUser?.uid) return;
    setLoadingAppointments(true);
    setMyAppointments([]);
    setScreen("myAppointments");
    try {
      const q = query(collection(db, "appointments"), where("customerId", "==", currentUser.uid));
      const snap = await getDocs(q);
      const bookings = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      bookings.sort((a, b) => `${a.date || ""} ${a.time || ""}`.localeCompare(`${b.date || ""} ${b.time || ""}`));
      setMyAppointments(bookings);
    } catch (e) {
      Alert.alert("Unable to Load Appointments", e.message || "Please check your connection.");
    } finally {
      setLoadingAppointments(false);
    }
  }

  async function handleLoadOwnerAppointments() {
    if (!currentUser?.uid || currentUser.role !== "owner") return;
    setLoadingOwnerAppointments(true);
    setOwnerAppointments([]);
    setScreen("ownerAppointments");
    try {
      const q = query(collection(db, "appointments"), where("establishmentId", "==", currentUser.uid), where("status", "==", "pending"));
      const snap = await getDocs(q);
      const bookings = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      bookings.sort((a, b) => `${a.date || ""} ${a.time || ""}`.localeCompare(`${b.date || ""} ${b.time || ""}`));
      setOwnerAppointments(bookings);
    } catch (e) {
      Alert.alert("Unable to Load Appointments", e.message || "Please try again.");
    } finally {
      setLoadingOwnerAppointments(false);
    }
  }

  async function handleLoadQueue() {
    if (!currentUser?.uid || currentUser.role !== "owner") return;
    setLoadingQueue(true);
    setQueueAppointments([]);
    setScreen("ownerQueue");
    try {
      const q = query(collection(db, "appointments"), where("establishmentId", "==", currentUser.uid));
      const snap = await getDocs(q);
      const bookings = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(item => ["confirmed", "inQueue", "inService"].includes(item.status));
      bookings.sort((a, b) => `${a.date || ""} ${a.time || ""}`.localeCompare(`${b.date || ""} ${b.time || ""}`));
      setQueueAppointments(bookings);
    } catch (e) {
      Alert.alert("Unable to Load Queue", e.message || "Please try again.");
    } finally {
      setLoadingQueue(false);
    }
  }

  async function handleUpdateQueueStatus(item, nextStatus) {
    if (!currentUser?.uid || !item?.id) return;
    setUpdatingQueueId(item.id);
    try {
      const appointmentRef = doc(db, "appointments", item.id);
      let lockRefs = [];
      if (nextStatus === "completed") {
        const lockQuery = query(collection(db, "slotLocks"), where("appointmentId", "==", item.id));
        const lockSnap = await getDocs(lockQuery);
        lockRefs = lockSnap.docs.map(lockDoc => lockDoc.ref);
      }

      await runTransaction(db, async transaction => {
        const appointmentSnap = await transaction.get(appointmentRef);
        if (!appointmentSnap.exists()) throw new Error("APPOINTMENT_NOT_FOUND");
        const appointment = appointmentSnap.data();
        if (appointment.establishmentId !== currentUser.uid) throw new Error("NOT_YOUR_SHOP");

        const lockSnapshots = await Promise.all(lockRefs.map(ref => transaction.get(ref)));
        transaction.update(appointmentRef, { status: nextStatus, queueUpdatedAt: serverTimestamp() });

        if (nextStatus === "completed") {
          lockSnapshots.forEach((lockSnap, index) => {
            if (lockSnap.exists() && lockSnap.data().appointmentId === item.id) {
              transaction.delete(lockRefs[index]);
            }
          });
        }
      });

      await handleLoadQueue();
      if (nextStatus === "completed") {
        Alert.alert("Service Completed", "Appointment completed. Reserved time slots released.");
      }
    } catch (e) {
      Alert.alert("Unable to Update Queue", e.message || "Please try again.");
    } finally {
      setUpdatingQueueId(null);
    }
  }

  async function handleConfirmAppointment(item) {
    if (!currentUser?.uid || !item?.id) return;
    Alert.alert("Confirm Appointment", `Confirm appointment for ${item.customerName || "this customer"}?`, [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Confirm",
        onPress: async () => {
          setConfirmingAppointmentId(item.id);
          try {
            const appointmentRef = doc(db, "appointments", item.id);
            await runTransaction(db, async transaction => {
              const appointmentSnap = await transaction.get(appointmentRef);
              if (!appointmentSnap.exists()) throw new Error("APPOINTMENT_NOT_FOUND");
              const appointment = appointmentSnap.data();
              if (appointment.establishmentId !== currentUser.uid) throw new Error("NOT_YOUR_SHOP");
              transaction.update(appointmentRef, { status: "confirmed" });
            });
            Alert.alert("Confirmed", "The customer appointment has been confirmed.");
            await handleLoadOwnerAppointments();
          } catch (e) {
            Alert.alert("Unable to Confirm", e.message || "Please try again.");
          } finally {
            setConfirmingAppointmentId(null);
          }
        }
      }
    ]);
  }

  async function handleCancelAppointment(item) {
    if (!currentUser?.uid || !item?.id) return;
    Alert.alert("Cancel Appointment", `Are you sure you want to cancel your appointment at ${item.shopName}?`, [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          setLoadingAppointments(true);
          try {
            const appointmentRef = doc(db, "appointments", item.id);
            const duration = Math.max(30, Number(item.durationMinutes) || 30);
            const lockTimes = makeSlotLockTimes(item.time, duration);
            const lockRefs = lockTimes.map(time => doc(db, "slotLocks", makeSlotLockId(item.establishmentId, item.date, time)));

            await runTransaction(db, async transaction => {
              const appointmentSnap = await transaction.get(appointmentRef);
              if (!appointmentSnap.exists()) throw new Error("APPOINTMENT_NOT_FOUND");
              const appointment = appointmentSnap.data();
              if (appointment.customerId !== currentUser.uid) throw new Error("NOT_YOUR_APPOINTMENT");

              const lockSnapshots = await Promise.all(lockRefs.map(ref => transaction.get(ref)));
              transaction.update(appointmentRef, { status: "cancelled", cancelledAt: serverTimestamp() });

              lockSnapshots.forEach((snap, index) => {
                if (snap.exists() && snap.data().appointmentId === item.id) {
                  transaction.delete(lockRefs[index]);
                }
              });
            });

            Alert.alert("Cancelled", "Your appointment has been cancelled.");
            await handleLoadMyAppointments();
          } catch (e) {
            Alert.alert("Unable to Cancel", e.message || "Please try again.");
            setLoadingAppointments(false);
          }
        }
      }
    ]);
  }

  async function handleLoadHomeShops() {
    setLoadingShops(true);
    try {
      const snap = await getDocs(query(collection(db, "establishments"), where("status", "==", "active")));
      const realShops = snap.docs.map(d => ({ id: d.id, ...d.data(), isDemo: false }));
      setShops([...realShops, ...DEMO_SHOPS]);
    } catch (e) {
      Alert.alert("Unable to Load Shops", "Please check your connection.");
    } finally {
      setLoadingShops(false);
    }
  }

  async function handleFindShops() {
    setScreen("shopList");
    setShops([]);
    await handleLoadHomeShops();
  }

  async function handleGetDirections(shop) {
    if (!shop?.address?.trim()) {
      Alert.alert("Address Missing", "This shop has no address yet.");
      return;
    }
    try {
      await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${shop.name || ""}, ${shop.address}`)}`);
    } catch (e) {
      Alert.alert("Unable to Open Maps", "Check if a browser is available.");
    }
  }

  async function handleLoadServices() {
    if (!currentUser?.uid) return;
    setLoadingServices(true);
    setServices([]);
    setEditingServiceId(null);
    setServiceName("");
    setServicePrice("");
    setServiceDuration("30");
    setScreen("manageServices");
    try {
      const snap = await getDocs(collection(db, "establishments", currentUser.uid, "services"));
      setServices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      Alert.alert("Unable to Load Services", "Check Firestore rules.");
    } finally {
      setLoadingServices(false);
    }
  }

  function handleViewShopDetails(shop) {
    setSelectedShop(shop);
    setScreen("shopDetails");
  }

  async function handleViewShopServices(shop) {
    setSelectedShop(shop);
    setCustomerServices([]);
    setLoadingCustomerServices(true);
    setScreen("customerServices");

    if (shop.isDemo) {
      setCustomerServices(shop.services || []);
      setLoadingCustomerServices(false);
      return;
    }

    try {
      const q = query(collection(db, "establishments", shop.id, "services"), where("status", "==", "active"));
      const snap = await getDocs(q);
      setCustomerServices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      Alert.alert("Unable to Load Services", "Check Firestore rules.");
    } finally {
      setLoadingCustomerServices(false);
    }
  }

  async function handleSaveService() {
    const cleanName = serviceName.trim();
    const cleanDescription = serviceDescription.trim();
    const price = Number(servicePrice);
    const duration = Number(serviceDuration);

    if (!currentUser?.uid) return;
    if (!cleanName || !servicePrice.trim()) {
      Alert.alert("Required", "Enter service name and price.");
      return;
    }

    setLoadingServices(true);
    try {
      const ref = collection(db, "establishments", currentUser.uid, "services");
      const item = {
        name: cleanName,
        description: cleanDescription,
        price,
        durationMinutes: duration,
        status: "active",
        updatedAt: serverTimestamp()
      };

      if (editingServiceId) {
        await updateDoc(doc(ref, editingServiceId), item);
        Alert.alert("Success", "Service updated.");
      } else {
        await addDoc(ref, { ...item, createdAt: serverTimestamp() });
        Alert.alert("Success", "Service added.");
      }

      setServiceName("");
      setServiceDescription("");
      setServicePrice("");
      setServiceDuration("30");
      setEditingServiceId(null);

      const snap = await getDocs(ref);
      setServices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      Alert.alert("Unable to Save", e.message || "Check Firestore rules.");
    } finally {
      setLoadingServices(false);
    }
  }

  function handleEditService(item) {
    setEditingServiceId(item.id);
    setServiceName(item.name || "");
    setServiceDescription(item.description || "");
    setServicePrice(String(item.price ?? ""));
    setServiceDuration(String(item.durationMinutes ?? 30));
  }

  function handleDeleteService(item) {
    Alert.alert("Delete Service", `Delete ${item.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "establishments", currentUser.uid, "services", item.id));
            setServices(prev => prev.filter(s => s.id !== item.id));
          } catch (e) {
            Alert.alert("Unable to Delete", "Check Firestore rules.");
          }
        }
      }
    ]);
  }

  async function handleSaveSchedule() {
    if (!currentUser?.uid || currentUser.role !== "owner") return;
    setSavingSchedule(true);
    try {
      await updateDoc(doc(db, "establishments", currentUser.uid), {
        operatingHours: schedule,
        scheduleUpdatedAt: serverTimestamp()
      });
      setEstablishment(prev => ({ ...prev, operatingHours: schedule }));
      Alert.alert("Success", "Shop schedule saved.");
    } catch (e) {
      Alert.alert("Unable to Save", "Check Firestore rules.");
    } finally {
      setSavingSchedule(false);
    }
  }

  function handleStartBooking(item) {
    if (selectedShop?.isDemo) {
      Alert.alert("Demo Shop", "This is a sample shop. Actual bookings are only available for registered shops.");
      return;
    }
    setSelectedService(item);
    setAppointmentDate("");
    setAppointmentTime("");
    setAvailableSlots([]);
    setOccupiedSlots([]);
    setScreen("bookAppointment");
  }

  async function handleLoadAvailableSlots(dateString) {
    if (!selectedShop?.id || !selectedService) return;
    setLoadingSlots(true);
    setAvailableSlots([]);
    setOccupiedSlots([]);
    setAppointmentTime("");

    try {
      const date = dateFromString(dateString);
      const dayName = WEEKDAYS[date.getDay()];
      const shopSnap = await getDoc(doc(db, "establishments", selectedShop.id));
      const shop = shopSnap.exists() ? shopSnap.data() : selectedShop;
      const hours = shop.operatingHours?.[dayName];

      if (!hours?.open) {
        Alert.alert("Shop Closed", `The shop is closed on ${dayName}.`);
        return;
      }

      const [oh, om] = hours.openingTime.split(":").map(Number);
      const [ch, cm] = hours.closingTime.split(":").map(Number);
      const open = oh * 60 + om;
      const close = ch * 60 + cm;
      const duration = Math.max(30, Number(selectedService.durationMinutes) || 30);
      const available = [];
      const occupied = [];

      for (let start = open; start + duration <= close; start += 30) {
        const slotDate = new Date(date);
        slotDate.setHours(Math.floor(start / 60), start % 60, 0, 0);
        if (slotDate <= new Date()) continue;

        const startTime = `${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}`;
        const lockTimes = makeSlotLockTimes(startTime, duration);
        const lockSnapshots = await Promise.all(
          lockTimes.map(time => getDoc(doc(db, "slotLocks", makeSlotLockId(selectedShop.id, dateString, time))))
        );

        if (lockSnapshots.some(snap => snap.exists())) {
          occupied.push(startTime);
        } else {
          available.push(startTime);
        }
      }

      setAvailableSlots(available);
      setOccupiedSlots(occupied);
    } catch (e) {
      Alert.alert("Unable to Load Times", e.message || "Please check Firestore rules.");
    } finally {
      setLoadingSlots(false);
    }
  }

  async function handleBookAppointment() {
    if (!currentUser?.uid || !selectedShop?.id || !selectedService?.id) return;
    if (selectedShop?.isDemo) {
      Alert.alert("Demo Shop", "This is a sample shop. Actual bookings are only available for registered shops.");
      return;
    }
    if (!appointmentDate || !appointmentTime || !availableSlots.includes(appointmentTime)) {
      Alert.alert("Required", "Choose a date and an available time slot.");
      return;
    }

    const duration = Math.max(30, Number(selectedService.durationMinutes) || 30);
    const lockTimes = makeSlotLockTimes(appointmentTime, duration);
    setBookingLoading(true);

    try {
      const appointmentRef = doc(collection(db, "appointments"));
      await runTransaction(db, async transaction => {
        const lockRefs = lockTimes.map(time => doc(db, "slotLocks", makeSlotLockId(selectedShop.id, appointmentDate, time)));
        const lockSnapshots = await Promise.all(lockRefs.map(ref => transaction.get(ref)));
        if (lockSnapshots.some(snap => snap.exists())) throw new Error("SLOT_TAKEN");

        lockRefs.forEach((ref, index) => {
          transaction.set(ref, {
            appointmentId: appointmentRef.id,
            customerId: currentUser.uid,
            establishmentId: selectedShop.id,
            date: appointmentDate,
            time: lockTimes[index],
            createdAt: serverTimestamp()
          });
        });

        transaction.set(appointmentRef, {
          customerId: currentUser.uid,
          customerName: currentUser.name || "",
          customerEmail: currentUser.email || "",
          establishmentId: selectedShop.id,
          shopName: selectedShop.name || "",
          serviceId: selectedService.id,
          serviceName: selectedService.name || "",
          price: Number(selectedService.price) || 0,
          durationMinutes: duration,
          date: appointmentDate,
          time: appointmentTime,
          status: "pending",
          createdAt: serverTimestamp()
        });
      });

      Alert.alert("Booking Submitted", "Your appointment request is pending shop confirmation.");
      setAppointmentDate("");
      setAppointmentTime("");
      setAvailableSlots([]);
      setSelectedService(null);
      setScreen("customerServices");
    } catch (e) {
      if (e.message === "SLOT_TAKEN") {
        Alert.alert("Time Just Taken", "Another customer booked that time. Please select another slot.");
        await handleLoadAvailableSlots(appointmentDate);
      } else {
        Alert.alert("Booking Failed", e.message || "Please try again.");
      }
    } finally {
      setBookingLoading(false);
    }
  }

  function input(label, value, setter, placeholder, options = {}) {
    return (
      <View key={label}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#aaa"
          value={value}
          onChangeText={setter}
          autoCapitalize={options.autoCapitalize || "sentences"}
          autoCorrect={false}
          secureTextEntry={!!options.secureTextEntry}
          keyboardType={options.keyboardType || "default"}
        />
      </View>
    );
  }

  function button(label, onPress, secondary = false, disabled = false) {
    return (
      <TouchableOpacity
        key={label}
        style={[secondary ? styles.secondaryButton : styles.button, disabled && { opacity: 0.5 }]}
        onPress={onPress}
        disabled={disabled}
      >
        <Text style={secondary ? styles.secondaryText : styles.buttonText}>{label}</Text>
      </TouchableOpacity>
    );
  }

  // Customer Navigation Bar
  const renderCustomerNavigationBar = () => (
    <View style={styles.navBar}>
      <TouchableOpacity style={styles.navItem} onPress={() => setScreen("customerDashboard")}>
        <View style={styles.navIconBox}><Text style={styles.navIconSymbol}>⌂</Text></View>
        <Text style={styles.navText}>Home</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.navItem} onPress={handleFindShops}>
        <View style={styles.navIconBox}><Text style={styles.navIconSymbol}>✦</Text></View>
        <Text style={styles.navText}>Service</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.navItem} onPress={handleLoadMyAppointments}>
        <View style={styles.navIconBox}><Text style={styles.navIconSymbol}>▤</Text></View>
        <Text style={styles.navText}>Appointments</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.navItem} onPress={() => setScreen("customerProfile")}>
        <View style={styles.navIconBox}><Text style={styles.navIconSymbol}>◯</Text></View>
        <Text style={styles.navText}>Profile</Text>
      </TouchableOpacity>
    </View>
  );

  // Shop Owner Navigation Bar
  const renderOwnerNavigationBar = () => (
    <View style={styles.navBar}>
      <TouchableOpacity style={styles.navItem} onPress={() => setScreen("ownerDashboard")}>
        <View style={styles.navIconBox}><Text style={styles.navIconSymbol}>⌂</Text></View>
        <Text style={styles.navText}>Dashboard</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.navItem} onPress={handleLoadServices}>
        <View style={styles.navIconBox}><Text style={styles.navIconSymbol}>✦</Text></View>
        <Text style={styles.navText}>Services</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.navItem} onPress={() => setScreen("manageSchedule")}>
        <View style={styles.navIconBox}><Text style={styles.navIconSymbol}>◷</Text></View>
        <Text style={styles.navText}>Schedule</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.navItem} onPress={handleLoadQueue}>
        <View style={styles.navIconBox}><Text style={styles.navIconSymbol}>▤</Text></View>
        <Text style={styles.navText}>Queue</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.navItem} onPress={() => setScreen("ownerProfile")}>
        <View style={styles.navIconBox}><Text style={styles.navIconSymbol}>◯</Text></View>
        <Text style={styles.navText}>Profile</Text>
      </TouchableOpacity>
    </View>
  );

  const page = children => (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.containerContent, { flexGrow: 1 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={true}
      >
        {children}
      </ScrollView>
      {currentUser?.role === "customer" && renderCustomerNavigationBar()}
      {currentUser?.role === "owner" && renderOwnerNavigationBar()}
    </KeyboardAvoidingView>
  );

  const header = title => (
    <>
      <Text style={styles.logo}>QueLess</Text>
      <Text style={styles.heading}>{title}</Text>
    </>
  );

  const loader = <ActivityIndicator size="large" color="#D9AE55" style={styles.loader} />;

  // CUSTOMER DASHBOARD
  if (screen === "customerDashboard" && currentUser) {
    return page(
      <>
        <View style={styles.homeHeader}>
          <View>
            <Text style={styles.logoSmall}>QueLess</Text>
            <Text style={styles.detail}>Welcome, {currentUser.name}!</Text>
          </View>

          <TouchableOpacity
            style={styles.profileIconButton}
            onPress={() => setScreen("customerProfile")}
          >
            <Text style={styles.profileIconSymbol}>◯</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Look good. Wait less.</Text>
          <Text style={styles.heroDescription}>
            Find your preferred barbershop or salon and book your next appointment.
          </Text>
          {button("BOOK AN APPOINTMENT", handleFindShops)}
        </View>

        <Text style={styles.sectionTitle}>Explore Haircuts</Text>
        <View style={styles.haircutGrid}>
          {["Fade", "Taper", "Buzz Cut", "Pompadour"].map(style => (
            <View style={styles.haircutCard} key={style}>
              <Text style={styles.haircutName}>{style}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Find a Shop</Text>
          <TouchableOpacity onPress={handleFindShops}>
            <Text style={styles.viewAll}>View All →</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.description}>Browse available barbershops and salons.</Text>

        {loadingShops ? loader : filteredShops.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.emptyTitle}>No Shops Found</Text>
            <Text style={styles.emptyDescription}>Try another shop name, address, or category.</Text>
          </View>
        ) : (
          filteredShops.slice(0, 3).map(shop => (
            <View style={styles.homeShopCard} key={shop.id}>
              <View style={{ flex: 1 }}>
                <Text style={styles.shopName}>{shop.name || "Unnamed Shop"}</Text>
                <Text style={styles.shopType}>{shop.type || "Barbershop / Salon"}</Text>
                <Text style={styles.detail}>{shop.address || "Address not provided"}</Text>
              </View>
              <TouchableOpacity
                style={styles.homeShopButton}
                onPress={() => handleViewShopServices(shop)}
              >
                <Text style={styles.homeShopButtonText}>View Services</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        {button("EXPLORE ALL SHOPS", handleFindShops)}
      </>
    );
  }

  // CUSTOMER PROFILE SCREEN
  if (screen === "customerProfile" && currentUser) {
    return page(
      <>
        {header("My Profile")}
        
        <View style={styles.profileRefContainer}>
          <View style={styles.profileAvatarContainer}>
            <Text style={styles.profileAvatarSymbol}>◯</Text>
          </View>
          <View style={styles.profileInfoContainer}>
            <Text style={styles.profileNameText}>{currentUser.name}</Text>
            <Text style={styles.profileStatusText}>Active Customer</Text>
          </View>
        </View>

        <View style={styles.shopDetailsCard}>
          <Text style={styles.sectionTitle}>Personal Info</Text>
          <Text style={styles.shopDetailText}>Email: {currentUser.email}</Text>
          <Text style={styles.shopDetailText}>Age: {currentUser.age || "N/A"}</Text>
          <Text style={styles.shopDetailText}>Role: Customer</Text>
        </View>

        {button(
          showAboutUs ? "HIDE ABOUT US" : "ABOUT US",
          () => setShowAboutUs(!showAboutUs),
          true
        )}

        {showAboutUs && (
          <View style={[styles.shopDetailsCard, { marginTop: 15 }]}>
            <Text style={styles.sectionTitle}>About Us</Text>
            <Text style={styles.shopDetailText}>
              
              <Text style={{ fontWeight: "bold", color: "#D9AE55" }}>Mission: </Text>
              To streamline grooming appointments and eliminate physical queues through simple, dependable digital booking.
            </Text>
            <Text style={[styles.shopDetailText, { marginTop: 10 }]}>
              <Text style={{ fontWeight: "bold", color: "#D9AE55" }}>Vision: </Text>
              To empower modern barbershops and salons while providing customers effortless appointment management.
            </Text>
          </View>
        )}

        {button("BACK TO DASHBOARD", () => setScreen("customerDashboard"), true)}
        {button("LOG OUT", handleLogout, true)}
      </>
    );
  }

  // OWNER PROFILE SCREEN
  if (screen === "ownerProfile" && currentUser?.role === "owner") {
    return page(
      <>
        {header("Owner Profile")}
        
        <View style={styles.profileRefContainer}>
          <View style={styles.profileAvatarContainer}>
            <Text style={styles.profileAvatarSymbol}>◯</Text>
          </View>
          <View style={styles.profileInfoContainer}>
            <Text style={styles.profileNameText}>{currentUser.name}</Text>
            <Text style={styles.profileStatusText}>Shop Owner</Text>
          </View>
        </View>

        <View style={styles.shopDetailsCard}>
          <Text style={styles.sectionTitle}>Personal & Shop Info</Text>
          <Text style={styles.shopDetailText}>Email: {currentUser.email}</Text>
          <Text style={styles.shopDetailText}>Shop Name: {establishment?.name || "N/A"}</Text>
          <Text style={styles.shopDetailText}>Shop Type: {establishment?.type || "N/A"}</Text>
          <Text style={styles.shopDetailText}>Address: {establishment?.address || "N/A"}</Text>
          <Text style={styles.shopDetailText}>Contact: {establishment?.contactNumber || "N/A"}</Text>
        </View>

        {button(
          showOwnerAboutUs ? "HIDE ABOUT US" : "ABOUT US",
          () => setShowOwnerAboutUs(!showOwnerAboutUs),
          true
        )}

        {showOwnerAboutUs && (
          <View style={[styles.shopDetailsCard, { marginTop: 15 }]}>
            <Text style={styles.sectionTitle}>About Us</Text>
            <Text style={styles.shopDetailText}>
              <Text style={{ fontWeight: "bold", color: "#D9AE55" }}>Mission: </Text>
              To streamline grooming appointments and eliminate physical queues through simple, dependable digital booking.
            </Text>
            <Text style={[styles.shopDetailText, { marginTop: 10 }]}>
              <Text style={{ fontWeight: "bold", color: "#D9AE55" }}>Vision: </Text>
              To empower modern barbershops and salons while providing customers effortless appointment management.
            </Text>
          </View>
        )}

        {button("BACK TO DASHBOARD", () => setScreen("ownerDashboard"), true)}
        {button("LOG OUT", handleLogout, true)}
      </>
    );
  }

  // CUSTOMER MY APPOINTMENTS
  if (screen === "myAppointments" && currentUser?.role === "customer") {
    const getStatusColor = status => {
      switch ((status || "pending").toLowerCase()) {
        case "pending": return "#E6A23C";
        case "confirmed": return "#3B82F6";
        case "inqueue": return "#A78BFA";
        case "inservice": return "#F59E0B";
        case "completed": return "#22C55E";
        case "cancelled": return "#EF4444";
        default: return "#9CA3AF";
      }
    };

    return page(
      <>
        {header("My Appointments")}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Appointment Summary</Text>
          <Text style={styles.detail}>Overview of your bookings</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 15 }}>
            {[
              { label: "Total", value: appointmentSummary.total, color: "#D4AF37" },
              { label: "Upcoming", value: appointmentSummary.upcoming, color: "#3B82F6" },
              { label: "In Progress", value: appointmentSummary.inProgress, color: "#A78BFA" },
              { label: "Completed", value: appointmentSummary.completed, color: "#22C55E" },
              { label: "Cancelled", value: appointmentSummary.cancelled, color: "#EF4444" }
            ].map(item => (
              <View key={item.label} style={{ width: "30%", minWidth: 90, backgroundColor: "#252525", borderRadius: 12, padding: 12, borderLeftWidth: 3, borderLeftColor: item.color }}>
                <Text style={{ color: item.color, fontSize: 22, fontWeight: "bold" }}>{item.value}</Text>
                <Text style={{ color: "#DDD", fontSize: 11, marginTop: 4 }}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {loadingAppointments ? loader : filteredMyAppointments.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>No Appointments Found</Text>
            <Text style={styles.detail}>There are no appointments under this filter.</Text>
          </View>
        ) : (
          filteredMyAppointments.map(item => (
            <View style={styles.shopCard} key={item.id}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <Text style={styles.shopName}>{item.shopName || "Shop"}</Text>
                <View style={{ backgroundColor: getStatusColor(item.status), paddingVertical: 5, paddingHorizontal: 9, borderRadius: 12 }}>
                  <Text style={{ color: "#111", fontSize: 10, fontWeight: "bold" }}>{(item.status || "pending").toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.detail}>Service: {item.serviceName || "Not specified"}</Text>
              <Text style={styles.detail}>Date: {item.date || "Not specified"}</Text>
              <Text style={styles.detail}>Time: {formatTime(item.time)}</Text>
              <Text style={styles.detail}>Price: ₱{Number(item.price || 0).toFixed(2)}</Text>

              {button("VIEW DETAILS", () => handleViewAppointmentDetails(item), true)}

              {["pending", "confirmed"].includes((item.status || "").toLowerCase()) && (
                <View style={{ marginTop: 14 }}>
                  {button("CANCEL APPOINTMENT", () => handleCancelAppointment(item), true, loadingAppointments)}
                </View>
              )}
            </View>
          ))
        )}

        {button("REFRESH APPOINTMENTS", handleLoadMyAppointments, true, loadingAppointments)}
        {button("BACK TO DASHBOARD", () => setScreen("customerDashboard"), true)}
      </>
    );
  }

  // CUSTOMER APPOINTMENT DETAILS
  if (screen === "appointmentDetails" && currentUser?.role === "customer") {
    const item = selectedAppointment;
    if (!item) {
      return page(
        <>
          {header("Appointment Details")}
          <Text style={styles.detail}>Appointment not found.</Text>
          {button("BACK TO APPOINTMENTS", handleLoadMyAppointments, true)}
        </>
      );
    }
    const status = (item.status || "pending").toLowerCase();
    return page(
      <>
        {header("Appointment Details")}
        <View style={styles.shopProfileCard}>
          <Text style={styles.shopProfileName}>{item.shopName || "Shop"}</Text>
          <Text style={styles.shopProfileType}>{status.toUpperCase()}</Text>
        </View>
        <View style={styles.shopDetailsCard}>
          <Text style={styles.sectionTitle}>Service Information</Text>
          <Text style={styles.shopDetailText}>Service: {item.serviceName || "Not specified"}</Text>
          <Text style={styles.shopDetailText}>Price: ₱{Number(item.price || 0).toFixed(2)}</Text>
          <Text style={styles.shopDetailText}>Duration: {item.durationMinutes || 30} minutes</Text>
        </View>
        <View style={styles.shopDetailsCard}>
          <Text style={styles.sectionTitle}>Appointment Schedule</Text>
          <Text style={styles.shopDetailText}>Date: {item.date || "Not specified"}</Text>
          <Text style={styles.shopDetailText}>Time: {formatTime(item.time)}</Text>
        </View>
        {["pending", "confirmed"].includes(status) && button("CANCEL APPOINTMENT", () => handleCancelAppointment(item), true)}
        {button("BACK TO MY APPOINTMENTS", handleLoadMyAppointments, true)}
      </>
    );
  }

  // CUSTOMER SHOP LIST
  if (screen === "shopList" && currentUser) {
    return page(
      <>
        {header("Explore Shops")}
        <Text style={styles.description}>Discover available barbershops and salons.</Text>
        <TextInput
          style={styles.shopSearchInput}
          placeholder="Search shop name or address..."
          placeholderTextColor="#aaa"
          value={shopSearch}
          onChangeText={setShopSearch}
        />
        <View style={styles.shopFilterRow}>
          {["All", "Barbershop", "Salon"].map(type => (
            <TouchableOpacity
              key={type}
              style={[styles.shopFilterButton, shopTypeFilter === type && styles.shopFilterActive]}
              onPress={() => setShopTypeFilter(type)}
            >
              <Text style={[styles.shopFilterText, shopTypeFilter === type && styles.shopFilterTextActive]}>{type}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loadingShops ? loader : filteredShops.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Shops Available</Text>
            <Text style={styles.emptyDescription}>There are no active shops available right now.</Text>
          </View>
        ) : (
          filteredShops.map(shop => (
            <View style={styles.modernShopCard} key={shop.id}>
              <View style={styles.shopInfo}>
                <Text style={styles.modernShopName}>{shop.name || "Unnamed Shop"}</Text>
                <Text style={styles.modernShopType}>{shop.type || "Barbershop / Salon"}</Text>
                {shop.isDemo && <Text style={{ color: "#B8860B", fontWeight: "bold", marginTop: 4 }}>DEMO SHOP • SAMPLE ONLY</Text>}
                <Text style={styles.modernShopDetail}>Location: {shop.address || "Address not provided"}</Text>
                <Text style={styles.modernShopDetail}>Contact: {shop.contactNumber || "Contact not provided"}</Text>
              </View>
              <View style={styles.shopActions}>
                <TouchableOpacity style={styles.outlineAction} onPress={() => handleViewShopDetails(shop)}>
                  <Text style={styles.outlineActionText}>Shop Details</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.goldAction} onPress={() => handleViewShopServices(shop)}>
                  <Text style={styles.goldActionText}>View Services →</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {button("BACK TO DASHBOARD", () => setScreen("customerDashboard"), true)}
      </>
    );
  }

  // CUSTOMER SHOP DETAILS
  if (screen === "shopDetails" && currentUser) {
    const shopHours = selectedShop?.operatingHours || DEFAULT_SCHEDULE;
    return page(
      <>
        {header("Shop Details")}
        <View style={styles.shopProfileCard}>
          <Text style={styles.shopProfileName}>{selectedShop?.name || "Shop Name"}</Text>
          <Text style={styles.shopProfileType}>{selectedShop?.type || "Barbershop / Salon"}</Text>
        </View>
        {selectedShop?.isDemo && <Text style={{ color: "#B8860B", fontWeight: "bold", marginTop: 6, textAlign: "center" }}>DEMO SHOP • SAMPLE ONLY</Text>}
        <View style={styles.shopDetailsCard}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <Text style={styles.shopDetailText}>Address: {selectedShop?.address || "Not provided"}</Text>
          <Text style={styles.shopDetailText}>Contact: {selectedShop?.contactNumber || "Not provided"}</Text>
          {button("OPEN LOCATION IN GOOGLE MAPS", () => handleGetDirections(selectedShop))}
        </View>
        <View style={styles.shopDetailsCard}>
          <Text style={styles.sectionTitle}>Operating Hours</Text>
          {DAYS.map(day => {
            const hours = shopHours[day];
            return (
              <View style={styles.hoursRow} key={day}>
                <Text style={styles.hoursDay}>{day}</Text>
                <Text style={styles.hoursValue}>
                  {!hours || !hours.open ? "Closed" : `${formatTime(hours.openingTime)} - ${formatTime(hours.closingTime)}`}
                </Text>
              </View>
            );
          })}
        </View>
        {button("VIEW AVAILABLE SERVICES", () => handleViewShopServices(selectedShop))}
        {button("BACK TO SHOPS", () => setScreen("shopList"), true)}
      </>
    );
  }

  // CUSTOMER SHOP SERVICES
  if (screen === "customerServices" && currentUser) {
    return page(
      <>
        {header("Our Services")}
        <View style={styles.shopProfileCard}>
          <Text style={styles.shopProfileName}>{selectedShop?.name || "Selected Shop"}</Text>
          <Text style={styles.shopProfileType}>{selectedShop?.type || "Barbershop / Salon"}</Text>
          {selectedShop?.isDemo && <Text style={{ color: "#B8860B", fontWeight: "bold", marginTop: 6 }}>DEMO SHOP • SAMPLE ONLY</Text>}
          <Text style={styles.shopProfileDetail}>Address: {selectedShop?.address || "Not provided"}</Text>
        </View>
        <Text style={styles.sectionTitle}>Available Services</Text>
        {loadingCustomerServices ? loader : customerServices.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Services Yet</Text>
            <Text style={styles.emptyDescription}>This shop has not added any active services.</Text>
          </View>
        ) : (
          customerServices.map(item => (
            <View style={styles.modernServiceCard} key={item.id}>
              <View style={styles.serviceTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modernServiceName}>{item.name || "Unnamed Service"}</Text>
                  <Text style={styles.serviceSubtitle}>{item.description || "No description available."}</Text>
                </View>
              </View>
              <View style={styles.serviceInfoRow}>
                <View>
                  <Text style={styles.infoLabel}>PRICE</Text>
                  <Text style={styles.servicePrice}>₱{Number(item.price || 0).toFixed(2)}</Text>
                </View>
                <View>
                  <Text style={styles.infoLabel}>DURATION</Text>
                  <Text style={styles.serviceDuration}>{item.durationMinutes || 30} minutes</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.bookServiceButton} onPress={() => handleStartBooking(item)}>
                <Text style={styles.bookServiceText}>BOOK THIS SERVICE →</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
        {button("BACK TO SHOPS", () => setScreen("shopList"), true)}
      </>
    );
  }

  // CUSTOMER BOOK APPOINTMENT SCREEN
  if (screen === "bookAppointment" && currentUser) {
    return page(
      <>
        {header("Book Appointment")}
        <View style={styles.card}>
          <Text style={styles.shopName}>{selectedShop?.name || "Selected Shop"}</Text>
          <Text style={styles.detail}>Service: {selectedService?.name || ""}</Text>
          <Text style={styles.detail}>Price: ₱{Number(selectedService?.price || 0).toFixed(2)}</Text>
          <Text style={styles.detail}>Duration: {selectedService?.durationMinutes || 30} minutes</Text>

          <Text style={styles.label}>Appointment Date</Text>
          <TouchableOpacity style={styles.input} onPress={() => setDatePickerVisible(true)}>
            <Text style={appointmentDate ? styles.detail : styles.placeholderText}>
              {appointmentDate ? dateFromString(appointmentDate).toLocaleDateString() : "Select appointment date  ▾"}
            </Text>
          </TouchableOpacity>

          {datePickerVisible && (
            <DateTimePicker
              mode="date"
              value={dateFromString(appointmentDate)}
              minimumDate={new Date()}
              onChange={(event, selectedDate) => {
                setDatePickerVisible(false);
                if (event.type !== "set" || !selectedDate) return;
                const value = formatDate(selectedDate);
                setAppointmentDate(value);
                handleLoadAvailableSlots(value);
              }}
            />
          )}

          <Text style={styles.label}>Appointment Time Slots</Text>
          <View style={styles.slotLegend}>
            <View style={styles.legendItem}>
              <View style={styles.availableDot} />
              <Text style={styles.hint}>Available</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={styles.occupiedDot} />
              <Text style={styles.hint}>Occupied</Text>
            </View>
          </View>

          {!appointmentDate ? (
            <Text style={styles.hint}>Select a date first to see appointment times.</Text>
          ) : loadingSlots ? (
            loader
          ) : availableSlots.length === 0 && occupiedSlots.length === 0 ? (
            <Text style={styles.hint}>No appointment times available. Try another date.</Text>
          ) : (
            <View style={styles.choiceRowWrap}>
              {availableSlots.map(slot => (
                <TouchableOpacity
                  key={slot}
                  style={[styles.choiceButton, styles.slotButton, styles.availableSlot, appointmentTime === slot && styles.choiceSelected]}
                  onPress={() => setAppointmentTime(slot)}
                >
                  <Text style={styles.choiceText}>{formatTime(slot)}</Text>
                  <Text style={styles.slotStatusText}>Available</Text>
                </TouchableOpacity>
              ))}
              {occupiedSlots.map(slot => (
                <TouchableOpacity key={slot} style={[styles.choiceButton, styles.slotButton, styles.occupiedSlot]} disabled={true}>
                  <Text style={styles.choiceText}>{formatTime(slot)}</Text>
                  <Text style={styles.slotStatusText}>Booked</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {button(bookingLoading ? "SUBMITTING..." : "CONFIRM BOOKING", handleBookAppointment, false, bookingLoading || loadingSlots)}
          {button("BACK TO SERVICES", () => setScreen("customerServices"), true, bookingLoading)}
        </View>
      </>
    );
  }

  // ENHANCED OWNER DASHBOARD (REMOVED REDUNDANT USER/SHOP INFO & ENHANCED ACTION GRID)
  if (screen === "ownerDashboard" && currentUser?.role === "owner") {
    return page(
      <>
        {header("Shop Owner Dashboard")}

        <View style={styles.ownerHeaderCard}>
          <Text style={styles.welcome}>Welcome back,</Text>
          <Text style={styles.ownerShopHeaderName}>{establishment?.name || currentUser.name}</Text>
          <Text style={styles.ownerHeaderSub}>Quick Store Operations & Management</Text>
        </View>

        <Text style={styles.sectionTitle}>Management Menu</Text>

        <View style={styles.ownerGridContainer}>
          <TouchableOpacity
            style={styles.ownerGridCard}
            onPress={() => handleGetDirections(establishment || {})}
          >
            <View style={styles.gridIconCircle}>
              <Text style={styles.gridIconSymbol}>✦</Text>
            </View>
            <Text style={styles.gridCardTitle}>View Map</Text>
            <Text style={styles.gridCardSub}>Open shop location</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.ownerGridCard}
            onPress={handleLoadServices}
          >
            <View style={styles.gridIconCircle}>
              <Text style={styles.gridIconSymbol}>✂</Text>
            </View>
            <Text style={styles.gridCardTitle}>Manage Services</Text>
            <Text style={styles.gridCardSub}>Prices & durations</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.ownerGridCard}
            onPress={() => setScreen("manageSchedule")}
          >
            <View style={styles.gridIconCircle}>
              <Text style={styles.gridIconSymbol}>◷</Text>
            </View>
            <Text style={styles.gridCardTitle}>Manage Schedule</Text>
            <Text style={styles.gridCardSub}>Operating hours</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.ownerGridCard}
            onPress={handleLoadOwnerAppointments}
          >
            <View style={styles.gridIconCircle}>
              <Text style={styles.gridIconSymbol}>✉</Text>
            </View>
            <Text style={styles.gridCardTitle}>Pending Requests</Text>
            <Text style={styles.gridCardSub}>Customer bookings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.ownerGridCard, { width: "100%" }]}
            onPress={handleLoadQueue}
          >
            <View style={styles.gridIconCircle}>
              <Text style={styles.gridIconSymbol}>▤</Text>
            </View>
            <Text style={styles.gridCardTitle}>Manage Queue</Text>
            <Text style={styles.gridCardSub}>Track live customer progress</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  // OWNER MANAGE SERVICES
  if (screen === "manageServices" && currentUser?.role === "owner") {
    return page(
      <>
        {header("Manage Services")}
        <TextInput
          style={styles.input}
          placeholder="Service Description"
          placeholderTextColor="#888"
          value={serviceDescription}
          onChangeText={setServiceDescription}
          multiline
        />

        <View style={styles.card}>
          {input("Service Name", serviceName, setServiceName, "Example: Haircut")}
          {input("Price (PHP)", servicePrice, setServicePrice, "Example: 100", { keyboardType: "decimal-pad" })}
          {input("Duration (minutes)", serviceDuration, setServiceDuration, "Example: 30", { keyboardType: "number-pad" })}

          {button(
            loadingServices ? "PLEASE WAIT..." : editingServiceId ? "UPDATE SERVICE" : "ADD SERVICE",
            handleSaveService,
            false,
            loadingServices
          )}

          {editingServiceId &&
            button("CANCEL EDIT", () => {
              setEditingServiceId(null);
              setServiceName("");
              setServiceDescription("");
              setServicePrice("");
              setServiceDuration("30");
            }, true)}
        </View>

        <Text style={styles.heading}>Your Services</Text>

        {loadingServices ? loader : services.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.detail}>No services added yet.</Text>
          </View>
        ) : (
          services.map(item => (
            <View style={styles.shopCard} key={item.id}>
              <Text style={styles.shopName}>{item.name}</Text>
              <Text style={styles.detail}>Description: {item.description || "No description provided."}</Text>
              <Text style={styles.detail}>Price: ₱{Number(item.price).toFixed(2)}</Text>
              <Text style={styles.detail}>Duration: {item.durationMinutes} minutes</Text>
              <Text style={styles.detail}>Status: {item.status}</Text>

              {button("EDIT SERVICE", () => handleEditService(item))}
              {button("DELETE SERVICE", () => handleDeleteService(item), true)}
            </View>
          ))
        )}

        {button("BACK TO DASHBOARD", () => setScreen("ownerDashboard"), true)}
      </>
    );
  }

  // OWNER MANAGE SCHEDULE
  if (screen === "manageSchedule" && currentUser?.role === "owner") {
    return page(
      <>
        {header("Manage Shop Schedule")}
        <Text style={styles.description}>Set the days and hours when your shop accepts appointments.</Text>

        {DAYS.map(day => {
          const hours = schedule[day] || DEFAULT_SCHEDULE[day];
          return (
            <View style={styles.shopCard} key={day}>
              <Text style={styles.shopName}>{day}</Text>
              {button(
                hours.open ? "OPEN — TAP TO CLOSE" : "CLOSED — TAP TO OPEN",
                () =>
                  setSchedule(prev => ({
                    ...prev,
                    [day]: { ...hours, open: !hours.open }
                  })),
                true
              )}

              {hours.open && (
                <>
                  <Text style={styles.label}>Opening Time</Text>
                  <TouchableOpacity
                    style={styles.input}
                    onPress={() => {
                      setScheduleDay(day);
                      setTimePickerField("openingTime");
                      setTimePickerVisible(true);
                    }}
                  >
                    <Text style={styles.detail}>{formatTime(hours.openingTime)} ▾</Text>
                  </TouchableOpacity>

                  <Text style={styles.label}>Closing Time</Text>
                  <TouchableOpacity
                    style={styles.input}
                    onPress={() => {
                      setScheduleDay(day);
                      setTimePickerField("closingTime");
                      setTimePickerVisible(true);
                    }}
                  >
                    <Text style={styles.detail}>{formatTime(hours.closingTime)} ▾</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          );
        })}

        {timePickerVisible && (
          <DateTimePicker
            mode="time"
            value={(() => {
              const [h, m] = (schedule[scheduleDay]?.[timePickerField] || "09:00").split(":").map(Number);
              const d = new Date();
              d.setHours(h, m, 0, 0);
              return d;
            })()}
            onChange={(event, selected) => {
              setTimePickerVisible(false);
              if (event.type !== "set" || !selected) return;
              const value = `${String(selected.getHours()).padStart(2, "0")}:${String(selected.getMinutes()).padStart(2, "0")}`;
              setSchedule(prev => ({
                ...prev,
                [scheduleDay]: { ...prev[scheduleDay], [timePickerField]: value }
              }));
            }}
          />
        )}

        {button(savingSchedule ? "SAVING..." : "SAVE SHOP SCHEDULE", handleSaveSchedule, false, savingSchedule)}
        {button("BACK TO DASHBOARD", () => setScreen("ownerDashboard"), true)}
      </>
    );
  }

  // OWNER PENDING APPOINTMENTS
  if (screen === "ownerAppointments" && currentUser?.role === "owner") {
    return page(
      <>
        {header("Pending Appointments")}
        <Text style={styles.description}>Review appointment requests from customers and confirm bookings.</Text>

        {loadingOwnerAppointments ? loader : ownerAppointments.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.emptyTitle}>No Pending Appointments</Text>
            <Text style={styles.emptyDescription}>New customer booking requests will appear here.</Text>
          </View>
        ) : (
          ownerAppointments.map(item => (
            <View style={styles.shopCard} key={item.id}>
              <Text style={styles.shopName}>{item.customerName || "Customer"}</Text>
              <Text style={styles.detail}>Service: {item.serviceName || "Not specified"}</Text>
              <Text style={styles.detail}>Date: {item.date || "Not specified"}</Text>
              <Text style={styles.detail}>Time: {formatTime(item.time)}</Text>
              <Text style={styles.detail}>Price: ₱{Number(item.price || 0).toFixed(2)}</Text>
              <Text style={styles.detail}>Customer Email: {item.customerEmail || "Not provided"}</Text>
              <Text style={styles.detail}>Booking Reference: {item.id}</Text>
              <Text style={styles.detail}>Status: PENDING</Text>

              {button("VIEW DETAILS", () => handleViewAppointmentDetails(item), true)}
              {button(
                confirmingAppointmentId === item.id ? "CONFIRMING..." : "CONFIRM APPOINTMENT",
                () => handleConfirmAppointment(item),
                false,
                confirmingAppointmentId !== null || loadingOwnerAppointments
              )}
            </View>
          ))
        )}

        {button("REFRESH APPOINTMENTS", handleLoadOwnerAppointments, true, loadingOwnerAppointments || confirmingAppointmentId !== null)}
        {button("BACK TO DASHBOARD", () => setScreen("ownerDashboard"), true)}
      </>
    );
  }

  // OWNER QUEUE MANAGEMENT
  if (screen === "ownerQueue" && currentUser?.role === "owner") {
    return page(
      <>
        {header("Manage Queue")}
        <Text style={styles.description}>Manage confirmed appointments according to their scheduled date and time.</Text>

        {loadingQueue ? loader : queueAppointments.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.emptyTitle}>No Customers in Queue</Text>
            <Text style={styles.emptyDescription}>Confirmed appointments will appear here.</Text>
          </View>
        ) : (
          queueAppointments.map((item, index) => (
            <View style={styles.shopCard} key={item.id}>
              <Text style={styles.shopName}>Queue #{index + 1} — {item.customerName || "Customer"}</Text>
              <Text style={styles.detail}>Service: {item.serviceName || "Not specified"}</Text>
              <Text style={styles.detail}>Date: {item.date || "Not specified"}</Text>
              <Text style={styles.detail}>Time: {formatTime(item.time)}</Text>
              <Text style={styles.detail}>Duration: {item.durationMinutes || 30} minutes</Text>
              <Text style={styles.detail}>Status: {(item.status || "").toUpperCase()}</Text>

              {item.status === "confirmed" &&
                button(
                  updatingQueueId === item.id ? "UPDATING..." : "ADD TO QUEUE",
                  () => handleUpdateQueueStatus(item, "inQueue"),
                  false,
                  updatingQueueId !== null
                )}

              {item.status === "inQueue" &&
                button(
                  updatingQueueId === item.id ? "UPDATING..." : "START SERVICE",
                  () => handleUpdateQueueStatus(item, "inService"),
                  false,
                  updatingQueueId !== null
                )}

              {item.status === "inService" &&
                button(
                  updatingQueueId === item.id ? "UPDATING..." : "MARK AS COMPLETED",
                  () => handleUpdateQueueStatus(item, "completed"),
                  false,
                  updatingQueueId !== null
                )}
            </View>
          ))
        )}

        {button("REFRESH QUEUE", handleLoadQueue, true, loadingQueue || updatingQueueId !== null)}
        {button("BACK TO DASHBOARD", () => setScreen("ownerDashboard"), true)}
      </>
    );
  }

  // OWNER APPOINTMENT DETAILS
  if (screen === "ownerAppointmentDetails" && currentUser?.role === "owner") {
    const item = selectedAppointment;
    if (!item || item.establishmentId !== currentUser.uid) {
      return page(
        <>
          {header("Appointment Details")}
          <Text style={styles.detail}>Appointment not found or access denied.</Text>
          {button("BACK TO PENDING APPOINTMENTS", handleLoadOwnerAppointments, true)}
        </>
      );
    }
    const status = (item.status || "pending").toLowerCase();
    return page(
      <>
        {header("Appointment Details")}
        <View style={styles.shopProfileCard}>
          <Text style={styles.shopProfileName}>{item.customerName || "Customer"}</Text>
          <Text style={styles.shopProfileType}>{status.toUpperCase()}</Text>
        </View>
        <View style={styles.shopDetailsCard}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <Text style={styles.shopDetailText}>Name: {item.customerName || "Not provided"}</Text>
          <Text style={styles.shopDetailText}>Email: {item.customerEmail || "Not provided"}</Text>
        </View>
        <View style={styles.shopDetailsCard}>
          <Text style={styles.sectionTitle}>Service Information</Text>
          <Text style={styles.shopDetailText}>Shop: {item.shopName || "Not specified"}</Text>
          <Text style={styles.shopDetailText}>Service: {item.serviceName || "Not specified"}</Text>
          <Text style={styles.shopDetailText}>Price: ₱{Number(item.price || 0).toFixed(2)}</Text>
          <Text style={styles.shopDetailText}>Duration: {item.durationMinutes || 30} minutes</Text>
        </View>
        <View style={styles.shopDetailsCard}>
          <Text style={styles.sectionTitle}>Appointment Schedule</Text>
          <Text style={styles.shopDetailText}>Date: {item.date || "Not specified"}</Text>
          <Text style={styles.shopDetailText}>Time: {formatTime(item.time)}</Text>
        </View>

        {status === "pending" &&
          button(
            confirmingAppointmentId === item.id ? "CONFIRMING..." : "CONFIRM APPOINTMENT",
            () => handleConfirmAppointment(item),
            false,
            confirmingAppointmentId !== null
          )}

        {button("BACK TO PENDING APPOINTMENTS", handleLoadOwnerAppointments, true)}
      </>
    );
  }

  // LOGIN SCREEN
  if (screen === "login") {
    return (
      <ImageBackground
        source={require("./barber-bg.jpg")}
        style={styles.bgImage}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          <ScrollView
            style={styles.containerTransparent}
            contentContainerStyle={[styles.content, { flexGrow: 1, paddingBottom: 60 }]}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.logo}>QueLess</Text>
            <Text style={styles.tagline}>Book smart. Wait less.</Text>
            <Text style={styles.heading}>Sign In</Text>
            <Text style={styles.description}>Sign in to your QueLess account.</Text>

            {input("Email Address", email, setEmail, "Enter your email", { autoCapitalize: "none", keyboardType: "email-address" })}
            {input("Password", password, setPassword, "Enter your password", { autoCapitalize: "none", secureTextEntry: true })}

            {button(loading ? "PLEASE WAIT..." : "SIGN IN", handleLogin, false, loading)}

            <TouchableOpacity
              style={[styles.secondaryButton, { marginTop: 15 }]}
              onPress={() => setRegTypeDropdownOpen(!regTypeDropdownOpen)}
            >
              <Text style={styles.secondaryText}>
                CREATE AN ACCOUNT  {regTypeDropdownOpen ? "▲" : "▼"}
              </Text>
            </TouchableOpacity>

            {regTypeDropdownOpen && (
              <View style={styles.dropdownContainer}>
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => {
                    setRegTypeDropdownOpen(false);
                    goTo("registerCustomer");
                  }}
                >
                  <Text style={styles.dropdownText}>CREATE CUSTOMER ACCOUNT</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => {
                    setRegTypeDropdownOpen(false);
                    goTo("registerOwner");
                  }}
                >
                  <Text style={styles.dropdownText}>REGISTER AS SHOP OWNER</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </ImageBackground>
    );
  }

  // CUSTOMER AND OWNER REGISTRATION
  const isCustomerRegistration = screen === "registerCustomer";
  const isOwnerRegistration = screen === "registerOwner";

  if (isCustomerRegistration || isOwnerRegistration) {
    return page(
      <>
        <Text style={styles.logo}>QueLess</Text>
        <Text style={styles.heading}>
          {isCustomerRegistration ? "Customer Registration" : "Shop Owner Registration"}
        </Text>

        {input("Full Name", name, setName, "Enter your full name")}
        {isCustomerRegistration && input("Age", age, setAge, "Enter your age", { keyboardType: "number-pad" })}
        {input("Email Address", email, setEmail, "Enter your email", { autoCapitalize: "none", keyboardType: "email-address" })}
        {input("Password", password, setPassword, "At least 6 characters and 1 capital letter", { autoCapitalize: "none", secureTextEntry: true })}
        {input("Confirm Password", confirmPassword, setConfirmPassword, "Re-enter your password", { autoCapitalize: "none", secureTextEntry: true })}

        {isOwnerRegistration && (
          <>
            {input("Shop Name", shopName, setShopName, "Enter shop name")}
            {input("Shop Address", shopAddress, setShopAddress, "Enter complete shop address")}
            {input("Contact Number", contactNumber, setContactNumber, "Enter contact number", { keyboardType: "phone-pad" })}
            <Text style={styles.label}>Shop Type</Text>
            <View style={styles.choiceRow}>
              <TouchableOpacity
                style={[styles.choiceButton, shopType === "Barbershop" && styles.choiceSelected]}
                onPress={() => setShopType("Barbershop")}
              >
                <Text style={styles.choiceText}>Barbershop</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.choiceButton, shopType === "Salon" && styles.choiceSelected]}
                onPress={() => setShopType("Salon")}
              >
                <Text style={styles.choiceText}>Salon</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {button(
          loading
            ? "PLEASE WAIT..."
            : isCustomerRegistration
            ? "CREATE CUSTOMER ACCOUNT"
            : "CREATE OWNER AND SHOP",
          isCustomerRegistration ? handleCustomerRegister : handleOwnerRegister,
          false,
          loading
        )}

        {button("BACK TO SIGN IN", () => goTo("login"), true)}
      </>
    );
  }

  return page(
    <>
      <Text style={styles.logo}>QueLess</Text>
      {button("BACK TO SIGN IN", () => goTo("login"), true)}
    </>
  );
}

// APP STYLES
const styles = StyleSheet.create({
  bgImage: { flex: 1, width: "100%", height: "100%" },
  overlay: { flex: 1, backgroundColor: "rgba(23, 23, 23, 0.45)" },

  // Slightly larger navigation bar
  navBar: {
    flexDirection: "row",
    backgroundColor: "#1c1c1c",
    borderTopWidth: 1,
    borderTopColor: "#333",
    paddingVertical: 14,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: "space-around",
    height: 78
  },
  navItem: { alignItems: "center", justifyContent: "center", flex: 1 },
  navIconBox: { width: 32, height: 32, justifyContent: "center", alignItems: "center", marginBottom: 3 },
  navIconSymbol: { color: "#D9AE55", fontSize: 23, fontWeight: "bold" },
  navText: { color: "#D9AE55", fontSize: 12, fontWeight: "600" },

  ownerHeaderCard: { backgroundColor: "#302719", padding: 22, borderRadius: 16, marginTop: 15, marginBottom: 20, borderWidth: 1, borderColor: "#D9AE55" },
  ownerShopHeaderName: { color: "#FFF", fontSize: 24, fontWeight: "bold", marginTop: 4 },
  ownerHeaderSub: { color: "#AAA", fontSize: 13, marginTop: 6 },

  ownerGridContainer: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 8 },
  ownerGridCard: { backgroundColor: "#252525", width: "48%", borderRadius: 15, padding: 18, borderWidth: 1, borderColor: "#444", alignItems: "flex-start" },
  gridIconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#302719", borderWidth: 1, borderColor: "#D9AE55", justifyContent: "center", alignItems: "center", marginBottom: 12 },
  gridIconSymbol: { color: "#D9AE55", fontSize: 20, fontWeight: "bold" },
  gridCardTitle: { color: "#FFF", fontSize: 15, fontWeight: "bold" },
  gridCardSub: { color: "#AAA", fontSize: 11, marginTop: 4 },

  profileIconButton: {
    backgroundColor: "#303030",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D9AE55"
  },
  profileIconSymbol: { color: "#D9AE55", fontSize: 20, fontWeight: "bold" },

  profileRefContainer: {
    backgroundColor: "#252525",
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#444"
  },
  profileAvatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#3a3a3a",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
    borderWidth: 1,
    borderColor: "#D9AE55"
  },
  profileAvatarSymbol: { color: "#D9AE55", fontSize: 28 },
  profileInfoContainer: { flex: 1 },
  profileNameText: { color: "#FFF", fontSize: 20, fontWeight: "bold" },
  profileStatusText: { color: "#D9AE55", fontSize: 13, marginTop: 4 },

  dropdownContainer: {
    backgroundColor: "rgba(37, 37, 37, 0.95)",
    borderWidth: 1,
    borderColor: "#D9AE55",
    borderRadius: 10,
    marginTop: 6,
    overflow: "hidden"
  },
  dropdownItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#444",
    alignItems: "center"
  },
  dropdownText: { color: "#D9AE55", fontWeight: "bold", fontSize: 12 },

  shopDetailsCard: { backgroundColor: "#252525", borderRadius: 14, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: "#444" },
  shopDetailText: { color: "#CCC", fontSize: 14, lineHeight: 23, marginTop: 8 },
  hoursRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#444" },
  hoursDay: { color: "#FFF", fontSize: 13, fontWeight: "600" },
  hoursValue: { color: "#D9AE55", fontSize: 12, fontWeight: "600", textAlign: "right", flexShrink: 1, marginLeft: 10 },

  shopSearchInput: { backgroundColor: "#252525", borderWidth: 1, borderColor: "#444", borderRadius: 10, padding: 14, color: "#FFF", marginTop: 15, marginBottom: 12, fontSize: 14 },
  shopFilterRow: { flexDirection: "row", gap: 10, marginBottom: 18 },
  shopFilterButton: { flex: 1, padding: 11, borderRadius: 9, borderWidth: 1, borderColor: "#D9AE55", alignItems: "center" },
  shopFilterActive: { backgroundColor: "#D9AE55" },
  shopFilterText: { color: "#D9AE55", fontWeight: "bold", fontSize: 12 },
  shopFilterTextActive: { color: "#171717" },

  modernShopCard: { backgroundColor: "#252525", borderRadius: 16, padding: 17, marginBottom: 16, borderWidth: 1, borderColor: "#444" },
  shopInfo: { marginBottom: 12 },
  modernShopName: { color: "#FFF", fontSize: 20, fontWeight: "bold", marginBottom: 5 },
  modernShopType: { color: "#D9AE55", fontWeight: "bold", marginBottom: 10 },
  modernShopDetail: { color: "#BBB", fontSize: 13, marginBottom: 7 },
  shopActions: { flexDirection: "row", gap: 10 },
  outlineAction: { flex: 1, borderWidth: 1, borderColor: "#D9AE55", borderRadius: 9, padding: 12, alignItems: "center" },
  outlineActionText: { color: "#D9AE55", fontWeight: "bold", fontSize: 12 },
  goldAction: { flex: 1.5, backgroundColor: "#D9AE55", borderRadius: 9, padding: 12, alignItems: "center" },
  goldActionText: { color: "#171717", fontWeight: "bold", fontSize: 12 },

  shopProfileCard: { backgroundColor: "#302719", borderRadius: 16, padding: 20, alignItems: "center", marginTop: 15, marginBottom: 20 },
  shopProfileName: { color: "#FFF", fontSize: 22, fontWeight: "bold", textAlign: "center" },
  shopProfileType: { color: "#D9AE55", fontWeight: "bold", marginTop: 5, marginBottom: 12 },
  shopProfileDetail: { color: "#CCC", fontSize: 13, textAlign: "center", marginBottom: 6 },

  modernServiceCard: { backgroundColor: "#252525", borderRadius: 15, borderWidth: 1, borderColor: "#444", padding: 17, marginBottom: 15 },
  serviceTopRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  modernServiceName: { color: "#FFF", fontSize: 18, fontWeight: "bold" },
  serviceSubtitle: { color: "#999", fontSize: 12, marginTop: 4 },
  serviceInfoRow: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#1C1C1C", padding: 14, borderRadius: 10, marginTop: 17 },
  infoLabel: { color: "#999", fontSize: 10, fontWeight: "bold", marginBottom: 6 },
  servicePrice: { color: "#D9AE55", fontSize: 18, fontWeight: "bold" },
  serviceDuration: { color: "#FFF", fontSize: 15, fontWeight: "600" },
  bookServiceButton: { backgroundColor: "#D9AE55", padding: 14, borderRadius: 9, alignItems: "center", marginTop: 15 },
  bookServiceText: { color: "#171717", fontWeight: "bold", fontSize: 13 },

  emptyCard: { backgroundColor: "#252525", borderRadius: 14, padding: 25, alignItems: "center", marginTop: 15, marginBottom: 15 },
  emptyTitle: { color: "#FFF", fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  emptyDescription: { color: "#AAA", textAlign: "center", lineHeight: 20 },

  homeShopCard: { backgroundColor: "#252525", borderWidth: 1, borderColor: "#555", borderRadius: 14, padding: 16, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  homeShopButton: { backgroundColor: "#D9AE55", paddingVertical: 11, paddingHorizontal: 12, borderRadius: 9 },
  homeShopButtonText: { color: "#171717", fontSize: 12, fontWeight: "bold" },

  container: { flex: 1, backgroundColor: "#171717" },
  containerContent: { padding: 24, paddingTop: 50, paddingBottom: 100 },
  containerTransparent: { flex: 1, backgroundColor: "transparent" },
  homeHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  logoSmall: { color: "#D9AE55", fontSize: 28, fontWeight: "bold", letterSpacing: 2, marginBottom: 8 },

  heroCard: { backgroundColor: "#302719", padding: 22, borderRadius: 15, marginBottom: 25 },
  heroTitle: { color: "#D9AE55", fontSize: 27, fontWeight: "bold", marginBottom: 10 },
  heroDescription: { color: "#FFF", fontSize: 14, lineHeight: 22 },

  sectionTitle: { color: "#FFF", fontSize: 20, fontWeight: "bold", marginTop: 18, marginBottom: 12 },
  haircutGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  haircutCard: { backgroundColor: "#252525", borderWidth: 1, borderColor: "#444", borderRadius: 12, width: "47%", padding: 18, alignItems: "center" },
  haircutName: { color: "#D9AE55", fontWeight: "bold", fontSize: 15 },

  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  viewAll: { color: "#D9AE55", fontWeight: "bold" },

  content: { flexGrow: 1, padding: 24, paddingTop: 50, paddingBottom: 40 },
  logo: { color: "#D9AE55", fontSize: 36, fontWeight: "bold", textAlign: "center", letterSpacing: 2 },
  tagline: { color: "#AAA", textAlign: "center", marginTop: 8, marginBottom: 36 },
  heading: { color: "#FFF", fontSize: 25, fontWeight: "bold", marginTop: 25, marginBottom: 10 },
  description: { color: "#AAA", fontSize: 14, lineHeight: 21, marginBottom: 20 },

  label: { color: "#D9AE55", fontWeight: "600", marginTop: 15, marginBottom: 8 },
  input: { backgroundColor: "rgba(37, 37, 37, 0.75)", borderColor: "#444", borderWidth: 1, borderRadius: 10, padding: 14, color: "#FFF", fontSize: 15 },
  placeholderText: { color: "#999", fontSize: 15 },
  hint: { color: "#AAA", fontSize: 12, lineHeight: 18, marginTop: 10 },

  button: { backgroundColor: "#D9AE55", padding: 16, borderRadius: 10, alignItems: "center", marginTop: 18 },
  buttonText: { color: "#171717", fontWeight: "bold", letterSpacing: 1, textAlign: "center" },

  secondaryButton: { borderColor: "#D9AE55", borderWidth: 1, borderRadius: 10, padding: 15, alignItems: "center", marginTop: 12 },
  secondaryText: { color: "#D9AE55", fontWeight: "bold", textAlign: "center" },

  card: { backgroundColor: "#252525", padding: 20, borderRadius: 12, marginTop: 20, marginBottom: 16 },
  welcome: { color: "#D9AE55", fontSize: 21, fontWeight: "bold", marginBottom: 4 },
  detail: { color: "#FFF", marginBottom: 10, lineHeight: 20 },

  shopCard: { backgroundColor: "#252525", padding: 18, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: "#444" },
  shopName: { color: "#D9AE55", fontSize: 20, fontWeight: "bold", marginBottom: 8 },
  shopType: { color: "#AAA", fontSize: 14, marginBottom: 12 },
  loader: { marginTop: 30 },

  choiceRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  choiceRowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 },
  choiceButton: { flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: "#555", alignItems: "center" },
  slotButton: { flexGrow: 0, flexBasis: "30%" },
  availableSlot: { backgroundColor: "#164D32", borderColor: "#22C55E" },
  occupiedSlot: { backgroundColor: "#5A2020", borderColor: "#EF4444", opacity: 0.8 },

  slotLegend: { flexDirection: "row", gap: 20, marginTop: 8, marginBottom: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  availableDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#22C55E" },
  occupiedDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#EF4444" },
  slotStatusText: { color: "#FFF", fontSize: 10, marginTop: 4 },

  choiceSelected: { backgroundColor: "#6B5428", borderColor: "#D9AE55" },
  choiceText: { color: "#FFF", fontWeight: "600", textAlign: "center" }
});