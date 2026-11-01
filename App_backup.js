import DateTimePicker from "@react-native-community/datetimepicker";
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
} from "react-native";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut,
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
} from "firebase/firestore";



export default function App() {
  const [screen, setScreen] = useState("login");
  const [schedule, setSchedule] = useState({
  Monday:    { open: true,  openingTime: "09:00", closingTime: "18:00" },
  Tuesday:   { open: true,  openingTime: "09:00", closingTime: "18:00" },
  Wednesday: { open: true,  openingTime: "09:00", closingTime: "18:00" },
  Thursday:  { open: true,  openingTime: "09:00", closingTime: "18:00" },
  Friday:    { open: true,  openingTime: "09:00", closingTime: "18:00" },
  Saturday:  { open: true,  openingTime: "09:00", closingTime: "18:00" },
  Sunday:    { open: false, openingTime: "09:00", closingTime: "18:00" },
});

const [savingSchedule, setSavingSchedule] = useState(false);
const [scheduleDay, setScheduleDay] = useState("Monday");
const [timePickerVisible, setTimePickerVisible] = useState(false);
const [timePickerField, setTimePickerField] = useState("openingTime");

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [shopName, setShopName] = useState("");
  const [shopAddress, setShopAddress] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [shopType, setShopType] = useState("Barbershop");

  const [loading, setLoading] = useState(false);
  const [loadingShops, setLoadingShops] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingCustomerServices, setLoadingCustomerServices] =
    useState(false);

  const [currentUser, setCurrentUser] = useState(null);
  const [establishment, setEstablishment] = useState(null);
  const [shops, setShops] = useState([]);

  const [selectedShop, setSelectedShop] = useState(null);
  const [customerServices, setCustomerServices] = useState([]);
 const [selectedService, setSelectedService] = useState(null);
const [appointmentDate, setAppointmentDate] = useState("");
const [appointmentTime, setAppointmentTime] = useState("");
const [bookingLoading, setBookingLoading] = useState(false);

const [datePickerVisible, setDatePickerVisible] = useState(false);
const [availableSlots, setAvailableSlots] = useState([]);
const [loadingSlots, setLoadingSlots] = useState(false);

  
  // CUSTOMER: START BOOKING
  function handleStartBooking(service) {
    setSelectedService(service);
    setAppointmentDate("");
    setAppointmentTime("");
    setScreen("bookAppointment");
  }

  
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

async function handleLoadAvailableSlots(dateString) {
  if (!selectedShop?.id || !selectedService) return;

  setLoadingSlots(true);
  setAvailableSlots([]);
  setAppointmentTime("");

  try {
    // Check the shop's weekly operating hours.
    const date = new Date(`${dateString}T12:00:00`);
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    const dayName = dayNames[date.getDay()];
    const hours = selectedShop.operatingHours?.[dayName];

    if (!hours || !hours.open) {
      Alert.alert(
        "Shop Closed",
        `The shop is closed on ${dayName}. Please choose another date.`
      );
      return;
    }

    const [openHour, openMinute] = hours.openingTime
      .split(":")
      .map(Number);

    const [closeHour, closeMinute] = hours.closingTime
      .split(":")
      .map(Number);

    const openingMinutes = openHour * 60 + openMinute;
    const closingMinutes = closeHour * 60 + closeMinute;
    const duration = Number(selectedService.durationMinutes) || 30;

    // Load existing bookings for this shop and date.
    const bookingsQuery = query(
      collection(db, "appointments"),
      where("establishmentId", "==", selectedShop.id),
      where("date", "==", dateString)
    );

    const snapshot = await getDocs(bookingsQuery);

    const existingBookings = snapshot.docs
      .map((bookingDoc) => bookingDoc.data())
      .filter((booking) =>
        ["pending", "confirmed"].includes(booking.status)
      );

    const now = new Date();
    const slots = [];

    // Offer start times every 30 minutes.
    for (
      let start = openingMinutes;
      start + duration <= closingMinutes;
      start += 30
    ) {
      const end = start + duration;

      const slotDate = new Date(date);
      slotDate.setHours(
        Math.floor(start / 60),
        start % 60,
        0,
        0
      );

      if (slotDate <= now) continue;

      // Check if this slot overlaps an existing appointment.
      const overlaps = existingBookings.some((booking) => {
        const [bookingHour, bookingMinute] = booking.time
          .split(":")
          .map(Number);

        const bookingStart = bookingHour * 60 + bookingMinute;
        const bookingEnd =
          bookingStart + (Number(booking.durationMinutes) || 30);

        return start < bookingEnd && end > bookingStart;
      });

      if (!overlaps) {
        slots.push(
          `${String(Math.floor(start / 60)).padStart(2, "0")}:${String(
            start % 60
          ).padStart(2, "0")}`
        );
      }
    }

    setAvailableSlots(slots);

    if (slots.length === 0) {
      Alert.alert(
        "No Available Times",
        "There are no available slots for this date. Please choose another date."
      );
    }
  } catch (error) {
    console.error("Load available slots:", error);

    Alert.alert(
      "Unable to Load Times",
      "Please check your internet connection and Firestore rules."
    );
  } finally {
    setLoadingSlots(false);
  }
}


  
async function handleSaveSchedule() {
  if (!currentUser?.uid || currentUser.role !== "owner") {
    Alert.alert("Error", "Only the shop owner can edit the schedule.");
    return;
  }

  for (const [day, hours] of Object.entries(schedule)) {
    if (!hours.open) continue;

    if (
      !/^\d{2}:\d{2}$/.test(hours.openingTime) ||
      !/^\d{2}:\d{2}$/.test(hours.closingTime) ||
      hours.openingTime >= hours.closingTime
    ) {
      Alert.alert(
        "Invalid Hours",
        `Please check the opening and closing times for ${day}.`
      );
      return;
    }
  }

  setSavingSchedule(true);

  try {
    await updateDoc(
      doc(db, "establishments", currentUser.uid),
      {
        operatingHours: schedule,
        scheduleUpdatedAt: serverTimestamp(),
      }
    );

    setEstablishment((previous) => ({
      ...previous,
      operatingHours: schedule,
    }));

    Alert.alert("Success", "Shop schedule saved.");
  } catch (error) {
    console.error("Save schedule:", error);

    Alert.alert(
      "Unable to Save",
      "Check your Firestore rules and try again."
    );
  } finally {
    setSavingSchedule(false);
  }
}


  // CUSTOMER: SAVE APPOINTMENT
  async function handleBookAppointment() {
    if (!currentUser?.uid || !selectedShop?.id || !selectedService?.id) {
      Alert.alert("Error", "Missing customer, shop, or service information.");
      return;
    }

    if (!appointmentDate.trim() || !appointmentTime.trim()) {
      Alert.alert("Required", "Enter your appointment date and time.");
      return;
    }

    // Expected formats: YYYY-MM-DD and HH:MM (24-hour time).
    const dateMatch = appointmentDate.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );
    const timeMatch = appointmentTime.match(
      /^([01]\d|2[0-3]):([0-5]\d)$/
    );

    if (!dateMatch || !timeMatch) {
      Alert.alert(
        "Invalid Schedule",
        "Use date format YYYY-MM-DD and time format HH:MM, such as 2026-11-05 and 14:30."
      );
      return;
    }

    const year = Number(dateMatch[1]);
    const month = Number(dateMatch[2]);
    const day = Number(dateMatch[3]);

    const parsedDate = new Date(year, month - 1, day);

    if (
      parsedDate.getFullYear() !== year ||
      parsedDate.getMonth() !== month - 1 ||
      parsedDate.getDate() !== day
    ) {
      Alert.alert("Invalid Date", "Please enter a real calendar date.");
      return;
    }

    const now = new Date();
    const appointmentDateTime = new Date(
      year,
      month - 1,
      day,
      Number(timeMatch[1]),
      Number(timeMatch[2])
    );

    if (appointmentDateTime <= now) {
      Alert.alert(
        "Invalid Schedule",
        "Please choose a future date and time."
      );
      return;
    }

    setBookingLoading(true);

    try {
      await addDoc(collection(db, "appointments"), {
        customerId: currentUser.uid,
        customerName: currentUser.name || "",
        customerEmail: currentUser.email || "",
        establishmentId: selectedShop.id,
        shopName: selectedShop.name || "",
        serviceId: selectedService.id,
        serviceName: selectedService.name || "",
        price: Number(selectedService.price) || 0,
        durationMinutes: Number(selectedService.durationMinutes) || 30,
        date: appointmentDate,
        time: appointmentTime,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      Alert.alert(
        "Booking Submitted",
        "Your appointment request was submitted. It is pending confirmation from the shop."
      );

      setAppointmentDate("");
      setAppointmentTime("");
      setSelectedService(null);
      setScreen("customerServices");
    } catch (error) {
      console.error("Book appointment:", error);

      Alert.alert(
        "Booking Failed",
        "Unable to save your booking. Check your Firestore rules and try again."
      );
    } finally {
      setBookingLoading(false);
    }
  }


  const [services, setServices] = useState([]);
  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceDuration, setServiceDuration] = useState("30");
  const [editingServiceId, setEditingServiceId] = useState(null);

  function clearPasswords() {
    setPassword("");
    setConfirmPassword("");
  }

  function goTo(nextScreen) {
    clearPasswords();
    setScreen(nextScreen);
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

    if (!/[A-Z]/.test(password)) {
      Alert.alert(
        "Invalid Password",
        "Include at least one capital letter."
      );
      return false;
    }

    if (password.length < 6) {
      Alert.alert(
        "Invalid Password",
        "Password must have at least 6 characters."
      );
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert("Password Mismatch", "Passwords do not match.");
      return false;
    }

    return true;
  }

  // CUSTOMER REGISTRATION
  async function handleCustomerRegister() {
    if (!validateRegistration()) return;

    if (!age.trim() || !Number.isInteger(Number(age))) {
      Alert.alert("Invalid Age", "Enter a valid age.");
      return;
    }

    if (Number(age) < 15) {
      Alert.alert(
        "Age Requirement",
        "You must be at least 15 years old."
      );
      return;
    }

    setLoading(true);

    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      await updateProfile(credential.user, {
        displayName: name.trim(),
      });

      await setDoc(doc(db, "users", credential.user.uid), {
        uid: credential.user.uid,
        name: name.trim(),
        age: Number(age),
        email: email.trim(),
        role: "customer",
        status: "active",
        createdAt: serverTimestamp(),
      });

      await signOut(auth);
      clearPasswords();
      setScreen("login");

      Alert.alert(
        "Success",
        "Customer account created. You can now sign in."
      );
    } catch (error) {
      console.error("Customer registration:", error);

      Alert.alert(
        "Registration Failed",
        error.code === "auth/email-already-in-use"
          ? "This email is already registered. Try signing in."
          : error.message || "Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // OWNER REGISTRATION
  async function handleOwnerRegister() {
    if (!validateRegistration()) return;

    if (
      !shopName.trim() ||
      !shopAddress.trim() ||
      !contactNumber.trim()
    ) {
      Alert.alert(
        "Required",
        "Complete the shop name, address, and contact number."
      );
      return;
    }

    setLoading(true);

    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      const uid = credential.user.uid;

      await updateProfile(credential.user, {
        displayName: name.trim(),
      });

      await setDoc(doc(db, "users", uid), {
        uid,
        name: name.trim(),
        email: email.trim(),
        role: "owner",
        status: "active",
        createdAt: serverTimestamp(),
      });

      const shopData = {
        establishmentId: uid,
        ownerId: uid,
        ownerName: name.trim(),
        name: shopName.trim(),
        address: shopAddress.trim(),
        contactNumber: contactNumber.trim(),
        type: shopType,
        status: "active",
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, "establishments", uid), shopData);

      setCurrentUser({
        uid,
        name: name.trim(),
        email: email.trim(),
        role: "owner",
        status: "active",
      });

      setEstablishment(shopData);
      clearPasswords();
      setScreen("ownerDashboard");

      Alert.alert(
        "Success",
        "Owner account and shop created successfully."
      );
    } catch (error) {
      console.error("Owner registration:", error);

      Alert.alert(
        "Registration Failed",
        error.code === "auth/email-already-in-use"
          ? "This email is already registered. Try signing in."
          : error.message ||
              "Check your Firestore rules and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // CUSTOMER AND OWNER LOGIN
  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert("Required", "Enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      const uid = credential.user.uid;
      const userSnapshot = await getDoc(doc(db, "users", uid));

      if (!userSnapshot.exists()) {
        await signOut(auth);
        Alert.alert(
          "Profile Not Found",
          "Your user profile was not found in Firestore."
        );
        return;
      }

      const userData = userSnapshot.data();

      if (userData.status !== "active") {
        await signOut(auth);
        Alert.alert("Account Disabled", "Your account is not active.");
        return;
      }

      const signedInUser = { ...userData, uid };

      if (userData.role === "customer") {
        setCurrentUser(signedInUser);
        setScreen("customerDashboard");
      } else if (userData.role === "owner") {
        const shopSnapshot = await getDoc(
          doc(db, "establishments", uid)
        );

        if (!shopSnapshot.exists()) {
          await signOut(auth);
          Alert.alert(
            "Shop Not Found",
            "Your owner account does not have a shop record yet."
          );
          return;
        }

        setCurrentUser(signedInUser);
        const shopData = shopSnapshot.data();

setEstablishment(shopData);

setSchedule(
  shopData.operatingHours || {
    Monday:    { open: true, openingTime: "09:00", closingTime: "18:00" },
    Tuesday:   { open: true, openingTime: "09:00", closingTime: "18:00" },
    Wednesday: { open: true, openingTime: "09:00", closingTime: "18:00" },
    Thursday:  { open: true, openingTime: "09:00", closingTime: "18:00" },
    Friday:    { open: true, openingTime: "09:00", closingTime: "18:00" },
    Saturday:  { open: true, openingTime: "09:00", closingTime: "18:00" },
    Sunday:    { open: false, openingTime: "09:00", closingTime: "18:00" },
  }
);

setScreen("ownerDashboard");
      } else {
        await signOut(auth);
        Alert.alert("Access Denied", "Unsupported account role.");
      }

      clearPasswords();
    } catch (error) {
      console.error("Login:", error);

      Alert.alert(
        "Login Failed",
        "Check your email and password, then try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // FIND ACTIVE SHOPS
  async function handleFindShops() {
    setLoadingShops(true);
    setShops([]);
    setScreen("shopList");

    try {
      const shopsQuery = query(
        collection(db, "establishments"),
        where("status", "==", "active")
      );

      const snapshot = await getDocs(shopsQuery);

      const shopList = snapshot.docs.map((shopDoc) => ({
        id: shopDoc.id,
        ...shopDoc.data(),
      }));

      setShops(shopList);
    } catch (error) {
      console.error("Load shops:", error);

      Alert.alert(
        "Unable to Load Shops",
        "Check your internet connection and Firestore read rules."
      );
    } finally {
      setLoadingShops(false);
    }
  }

  // OPEN GOOGLE MAPS
  async function handleGetDirections(shop) {
    const destination = shop?.address?.trim();

    if (!destination) {
      Alert.alert(
        "Address Missing",
        "This shop does not have an address yet."
      );
      return;
    }

    const queryText = encodeURIComponent(
      `${shop.name || ""}, ${destination}`
    );

    const mapsUrl =
      `https://www.google.com/maps/search/?api=1&query=${queryText}`;

    try {
      await Linking.openURL(mapsUrl);
    } catch (error) {
      console.error("Open Maps:", error);

      Alert.alert(
        "Unable to Open Maps",
        "Please check if a browser is available on your device."
      );
    }
  }

  // OWNER: LOAD SERVICES
  async function handleLoadServices() {
    if (!currentUser?.uid) {
      Alert.alert("Error", "Please sign in again.");
      return;
    }

    setLoadingServices(true);
    setServices([]);
    setEditingServiceId(null);
    setServiceName("");
    setServicePrice("");
    setServiceDuration("30");
    setScreen("manageServices");

    try {
      const servicesRef = collection(
        db,
        "establishments",
        currentUser.uid,
        "services"
      );

      const snapshot = await getDocs(servicesRef);

      const serviceList = snapshot.docs.map((serviceDoc) => ({
        id: serviceDoc.id,
        ...serviceDoc.data(),
      }));

      setServices(serviceList);
    } catch (error) {
      console.error("Load services:", error);

      Alert.alert(
        "Unable to Load Services",
        "Check your Firestore security rules and internet connection."
      );
    } finally {
      setLoadingServices(false);
    }
  }

  // CUSTOMER: VIEW ACTIVE SERVICES FOR A SHOP
  async function handleViewShopServices(shop) {
    if (!shop?.id) {
      Alert.alert("Error", "Shop information is missing.");
      return;
    }

    setSelectedShop(shop);
    setCustomerServices([]);
    setLoadingCustomerServices(true);
    setScreen("customerServices");

    try {
      const servicesRef = collection(
        db,
        "establishments",
        shop.id,
        "services"
      );

      // Query only active services for customers.
      const servicesQuery = query(
        servicesRef,
        where("status", "==", "active")
      );

      const snapshot = await getDocs(servicesQuery);

      const serviceList = snapshot.docs.map((serviceDoc) => ({
        id: serviceDoc.id,
        ...serviceDoc.data(),
      }));

      setCustomerServices(serviceList);
    } catch (error) {
      console.error("Load customer services:", error);

      Alert.alert(
        "Unable to Load Services",
        "Check Firestore rules and try again."
      );
    } finally {
      setLoadingCustomerServices(false);
    }
  }

  // OWNER: ADD OR UPDATE SERVICE
  async function handleSaveService() {
    const nameValue = serviceName.trim();
    const priceValue = Number(servicePrice);
    const durationValue = Number(serviceDuration);

    if (!currentUser?.uid) {
      Alert.alert("Error", "Please sign in again.");
      return;
    }

    if (!nameValue || !servicePrice.trim()) {
      Alert.alert("Required", "Enter the service name and price.");
      return;
    }

    if (!Number.isFinite(priceValue) || priceValue < 0) {
      Alert.alert("Invalid Price", "Enter a valid price.");
      return;
    }

    if (
      !serviceDuration.trim() ||
      !Number.isInteger(durationValue) ||
      durationValue <= 0
    ) {
      Alert.alert("Invalid Duration", "Enter duration in minutes.");
      return;
    }

    setLoadingServices(true);

    try {
      const servicesRef = collection(
        db,
        "establishments",
        currentUser.uid,
        "services"
      );

      const serviceData = {
        name: nameValue,
        price: priceValue,
        durationMinutes: durationValue,
        status: "active",
        updatedAt: serverTimestamp(),
      };

      if (editingServiceId) {
        await updateDoc(
          doc(servicesRef, editingServiceId),
          serviceData
        );

        Alert.alert("Success", "Service updated.");
      } else {
        await addDoc(servicesRef, {
          ...serviceData,
          createdAt: serverTimestamp(),
        });

        Alert.alert("Success", "Service added.");
      }

      setServiceName("");
      setServicePrice("");
      setServiceDuration("30");
      setEditingServiceId(null);

      const snapshot = await getDocs(servicesRef);

      setServices(
        snapshot.docs.map((serviceDoc) => ({
          id: serviceDoc.id,
          ...serviceDoc.data(),
        }))
      );
    } catch (error) {
      console.error("Save service:", error);

      Alert.alert(
        "Unable to Save",
        "The service was not saved. Check your Firestore rules."
      );
    } finally {
      setLoadingServices(false);
    }
  }

  // OWNER: PREPARE SERVICE FOR EDITING
  function handleEditService(service) {
    setEditingServiceId(service.id);
    setServiceName(service.name || "");
    setServicePrice(String(service.price ?? ""));
    setServiceDuration(String(service.durationMinutes ?? 30));
  }

  // OWNER: DELETE SERVICE
  function handleDeleteService(service) {
    Alert.alert(
      "Delete Service",
      `Are you sure you want to delete ${service.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(
                doc(
                  db,
                  "establishments",
                  currentUser.uid,
                  "services",
                  service.id
                )
              );

              setServices((previous) =>
                previous.filter((item) => item.id !== service.id)
              );

              Alert.alert("Success", "Service deleted.");
            } catch (error) {
              console.error("Delete service:", error);

              Alert.alert(
                "Unable to Delete",
                "Check your Firestore security rules."
              );
            }
          },
        },
      ]
    );
  }

  // LOGOUT
  async function handleLogout() {
    try {
      await signOut(auth);

      setCurrentUser(null);
      setEstablishment(null);
      setShops([]);
      setSelectedShop(null);
      setCustomerServices([]);
      setServices([]);
      setEmail("");
      clearPasswords();
      setScreen("login");
    } catch (error) {
      console.error("Logout:", error);
      Alert.alert("Error", "Unable to log out.");
    }
  }

  // CUSTOMER DASHBOARD
  if (screen === "customerDashboard" && currentUser) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.logo}>QueLess</Text>
        <Text style={styles.heading}>Customer Dashboard</Text>

        <View style={styles.card}>
          <Text style={styles.welcome}>
            Welcome, {currentUser.name}!
          </Text>
          <Text style={styles.detail}>Age: {currentUser.age}</Text>
          <Text style={styles.detail}>Email: {currentUser.email}</Text>
          <Text style={styles.detail}>Account: Customer</Text>
        </View>

        <Text style={styles.description}>
          Find a barbershop or salon near your preferred location.
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={handleFindShops}
        >
          <Text style={styles.buttonText}>FIND A SHOP</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleLogout}
        >
          <Text style={styles.secondaryText}>LOG OUT</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // CUSTOMER: SHOP LIST
  if (screen === "shopList" && currentUser) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.logo}>QueLess</Text>
        <Text style={styles.heading}>Find a Shop</Text>

        <Text style={styles.description}>
          Browse registered barbershops and salons.
        </Text>

        {loadingShops ? (
          <ActivityIndicator
            size="large"
            color="#D9AE55"
            style={styles.loader}
          />
        ) : shops.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.detail}>
              No active shops found yet.
            </Text>
          </View>
        ) : (
          shops.map((shop) => (
            <View style={styles.shopCard} key={shop.id}>
              <Text style={styles.shopName}>
                {shop.name || "Unnamed Shop"}
              </Text>

              <Text style={styles.shopType}>
                {shop.type || "Barbershop / Salon"}
              </Text>

              <Text style={styles.detail}>
                Address: {shop.address || "No address provided"}
              </Text>

              <Text style={styles.detail}>
                Contact: {shop.contactNumber || "Not provided"}
              </Text>

              <TouchableOpacity
                style={styles.button}
                onPress={() => handleGetDirections(shop)}
              >
                <Text style={styles.buttonText}>
                  GET DIRECTIONS
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.button}
                onPress={() => handleViewShopServices(shop)}
              >
                <Text style={styles.buttonText}>
                  VIEW SERVICES
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setScreen("customerDashboard")}
        >
          <Text style={styles.secondaryText}>
            BACK TO DASHBOARD
          </Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // CUSTOMER: SERVICES FOR SELECTED SHOP
  if (screen === "customerServices" && currentUser) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.logo}>QueLess</Text>
        <Text style={styles.heading}>Shop Services</Text>

        <View style={styles.card}>
          <Text style={styles.shopName}>
            {selectedShop?.name || "Selected Shop"}
          </Text>

          <Text style={styles.detail}>
            Address: {selectedShop?.address || "Not provided"}
          </Text>

          <Text style={styles.detail}>
            Contact: {selectedShop?.contactNumber || "Not provided"}
          </Text>
        </View>

        {loadingCustomerServices ? (
          <ActivityIndicator
            size="large"
            color="#D9AE55"
            style={styles.loader}
          />
        ) : customerServices.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.detail}>
              No active services available for this shop yet.
            </Text>
          </View>
        ) : (
          customerServices.map((service) => (
            <View style={styles.shopCard} key={service.id}>
              <Text style={styles.shopName}>{service.name}</Text>

              <Text style={styles.detail}>
                Price: ₱{Number(service.price).toFixed(2)}
              </Text>

              <Text style={styles.detail}>
                Duration: {service.durationMinutes} minutes
              </Text>
              
<TouchableOpacity
  style={styles.button}
  onPress={() => handleStartBooking(service)}
>
  <Text style={styles.buttonText}>BOOK APPOINTMENT</Text>
</TouchableOpacity>

            </View>
          ))
        )}

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setScreen("shopList")}
        >
          <Text style={styles.secondaryText}>BACK TO SHOPS</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }


  // CUSTOMER: BOOK APPOINTMENT SCREEN
  if (screen === "bookAppointment" && currentUser) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.logo}>QueLess</Text>
        <Text style={styles.heading}>Book Appointment</Text>

        <View style={styles.card}>
          <Text style={styles.shopName}>
            {selectedShop?.name || "Selected Shop"}
          </Text>

          <Text style={styles.detail}>
            Service: {selectedService?.name || ""}
          </Text>

          <Text style={styles.detail}>
            Price: ₱
            {Number(selectedService?.price || 0).toFixed(2)}
          </Text>

          <Text style={styles.detail}>
            Duration: {selectedService?.durationMinutes || 30} minutes
          </Text>

         
<Text style={styles.label}>Appointment Date</Text>

<TouchableOpacity
  style={styles.input}
  onPress={() => setDatePickerVisible(true)}
>
  <Text style={styles.detail}>
    {appointmentDate
      ? new Date(`${appointmentDate}T12:00:00`).toLocaleDateString()
      : "Select appointment date  ▾"}
  </Text>
</TouchableOpacity>

{datePickerVisible && (
  <DateTimePicker
    mode="date"
    value={
      appointmentDate
        ? new Date(`${appointmentDate}T12:00:00`)
        : new Date()
    }
    minimumDate={new Date()}
    onChange={(event, selectedDate) => {
      setDatePickerVisible(false);

      if (event.type !== "set" || !selectedDate) return;

      const dateString = formatDate(selectedDate);
      setAppointmentDate(dateString);
      handleLoadAvailableSlots(dateString);
    }}
  />
)}

<Text style={styles.label}>Available Time Slots</Text>

{!appointmentDate ? (
  <Text style={styles.hint}>
    Select a date first to see available times.
  </Text>
) : loadingSlots ? (
  <ActivityIndicator
    size="large"
    color="#D9AE55"
    style={styles.loader}
  />
) : availableSlots.length === 0 ? (
  <Text style={styles.hint}>
    No available time slots. Try another date or check the shop schedule.
  </Text>
) : (
  <View style={styles.choiceRow}>
    {availableSlots.map((slot) => (
      <TouchableOpacity
        key={slot}
        style={[
          styles.choiceButton,
          appointmentTime === slot && styles.choiceSelected,
        ]}
        onPress={() => setAppointmentTime(slot)}
      >
        <Text style={styles.choiceText}>{slot}</Text>
      </TouchableOpacity>
    ))}
  </View>
)}

<Text style={styles.hint}>
  Choose one of the available times. Your appointment will remain
  pending until the shop confirms it.
</Text>


          <Text style={styles.hint}>
            Use 24-hour time. Example: 2:30 PM is 14:30.
            The shop still needs to confirm your request.
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={handleBookAppointment}
            disabled={bookingLoading}
          >
            <Text style={styles.buttonText}>
              {bookingLoading ? "SUBMITTING..." : "CONFIRM BOOKING"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setScreen("customerServices")}
            disabled={bookingLoading}
          >
            <Text style={styles.secondaryText}>
              BACK TO SERVICES
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }


  // OWNER: MANAGE SERVICES
  if (screen === "manageServices" && currentUser) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.logo}>QueLess</Text>
        <Text style={styles.heading}>Manage Services</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Service Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Example: Haircut"
            placeholderTextColor="#999"
            value={serviceName}
            onChangeText={setServiceName}
          />

          <Text style={styles.label}>Price (PHP)</Text>
          <TextInput
            style={styles.input}
            placeholder="Example: 100"
            placeholderTextColor="#999"
            value={servicePrice}
            onChangeText={setServicePrice}
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>Duration (minutes)</Text>
          <TextInput
            style={styles.input}
            placeholder="Example: 30"
            placeholderTextColor="#999"
            value={serviceDuration}
            onChangeText={setServiceDuration}
            keyboardType="number-pad"
          />

          <TouchableOpacity
            style={styles.button}
            onPress={handleSaveService}
            disabled={loadingServices}
          >
            <Text style={styles.buttonText}>
              {loadingServices
                ? "PLEASE WAIT..."
                : editingServiceId
                ? "UPDATE SERVICE"
                : "ADD SERVICE"}
            </Text>
          </TouchableOpacity>

          {editingServiceId && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                setEditingServiceId(null);
                setServiceName("");
                setServicePrice("");
                setServiceDuration("30");
              }}
            >
              <Text style={styles.secondaryText}>CANCEL EDIT</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.heading}>Your Services</Text>

        {loadingServices ? (
          <ActivityIndicator
            size="large"
            color="#D9AE55"
            style={styles.loader}
          />
        ) : services.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.detail}>
              No services added yet. Add your first service above.
            </Text>
          </View>
        ) : (
          services.map((service) => (
            <View style={styles.shopCard} key={service.id}>
              <Text style={styles.shopName}>{service.name}</Text>

              <Text style={styles.detail}>
                Price: ₱{Number(service.price).toFixed(2)}
              </Text>

              <Text style={styles.detail}>
                Duration: {service.durationMinutes} minutes
              </Text>

              <Text style={styles.detail}>
                Status: {service.status}
              </Text>

              <TouchableOpacity
                style={styles.button}
                onPress={() => handleEditService(service)}
              >
                <Text style={styles.buttonText}>EDIT SERVICE</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => handleDeleteService(service)}
              >
                <Text style={styles.secondaryText}>DELETE SERVICE</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setScreen("ownerDashboard")}
        >
          <Text style={styles.secondaryText}>BACK TO DASHBOARD</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // OWNER: MANAGE SHOP SCHEDULE
  if (screen === "manageSchedule" && currentUser?.role === "owner") {
    const days = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];

    function showTimePicker(day, field) {
      setScheduleDay(day);
      setTimePickerField(field);
      setTimePickerVisible(true);
    }

    function formatTime(time) {
      if (!time) return "";
      const [hours, minutes] = time.split(":").map(Number);
      const period = hours >= 12 ? "PM" : "AM";
      const displayHour = hours % 12 || 12;

      return `${displayHour}:${String(minutes).padStart(2, "0")} ${period}`;
    }

    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.logo}>QueLess</Text>
        <Text style={styles.heading}>Manage Shop Schedule</Text>

        <Text style={styles.description}>
          Set the days and hours when your shop accepts appointments.
        </Text>

        {days.map((day) => {
          const hours = schedule[day] || {
            open: false,
            openingTime: "09:00",
            closingTime: "18:00",
          };

          return (
            <View style={styles.shopCard} key={day}>
              <Text style={styles.shopName}>{day}</Text>

              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  hours.open && { backgroundColor: "#354A35" },
                ]}
                onPress={() =>
                  setSchedule((previous) => ({
                    ...previous,
                    [day]: {
                      ...hours,
                      open: !hours.open,
                    },
                  }))
                }
              >
                <Text style={styles.secondaryText}>
                  {hours.open ? "OPEN — TAP TO CLOSE" : "CLOSED — TAP TO OPEN"}
                </Text>
              </TouchableOpacity>

              {hours.open && (
                <>
                  <Text style={styles.label}>Opening Time</Text>

                  <TouchableOpacity
                    style={styles.input}
                    onPress={() => showTimePicker(day, "openingTime")}
                  >
                    <Text style={styles.detail}>
                      {formatTime(hours.openingTime)}  ▾
                    </Text>
                  </TouchableOpacity>

                  <Text style={styles.label}>Closing Time</Text>

                  <TouchableOpacity
                    style={styles.input}
                    onPress={() => showTimePicker(day, "closingTime")}
                  >
                    <Text style={styles.detail}>
                      {formatTime(hours.closingTime)}  ▾
                    </Text>
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
              const time = schedule[scheduleDay]?.[timePickerField] || "09:00";
              const [hours, minutes] = time.split(":").map(Number);
              const date = new Date();
              date.setHours(hours, minutes, 0, 0);
              return date;
            })()}
            onChange={(event, selectedDate) => {
              setTimePickerVisible(false);

              if (event.type !== "set" || !selectedDate) return;

              const time =
                `${String(selectedDate.getHours()).padStart(2, "0")}:` +
                `${String(selectedDate.getMinutes()).padStart(2, "0")}`;

              setSchedule((previous) => ({
                ...previous,
                [scheduleDay]: {
                  ...previous[scheduleDay],
                  [timePickerField]: time,
                },
              }));
            }}
          />
        )}

        <TouchableOpacity
          style={styles.button}
          onPress={handleSaveSchedule}
          disabled={savingSchedule}
        >
          <Text style={styles.buttonText}>
            {savingSchedule ? "SAVING..." : "SAVE SHOP SCHEDULE"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setScreen("ownerDashboard")}
        >
          <Text style={styles.secondaryText}>BACK TO DASHBOARD</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

// OWNER DASHBOARD
if (screen === "ownerDashboard" && currentUser) {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.logo}>QueLess</Text>
      <Text style={styles.heading}>Shop Owner Dashboard</Text>

      <View style={styles.card}>
        <Text style={styles.welcome}>
          Welcome, {currentUser.name}!
        </Text>

        <Text style={styles.detail}>
          Email: {currentUser.email}
        </Text>

        <Text style={styles.detail}>
          Account: Shop Owner
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.shopName}>
          {establishment?.name || "Shop name unavailable"}
        </Text>

        <Text style={styles.detail}>
          Type: {establishment?.type || "Not provided"}
        </Text>

        <Text style={styles.detail}>
          Address: {establishment?.address || "Not provided"}
        </Text>

        <Text style={styles.detail}>
          Contact: {establishment?.contactNumber || "Not provided"}
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => handleGetDirections(establishment || {})}
        >
          <Text style={styles.buttonText}>
            VIEW SHOP ON MAP
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={handleLoadServices}
        >
          <Text style={styles.buttonText}>
            MANAGE SERVICES
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => setScreen("manageSchedule")}
        >
          <Text style={styles.buttonText}>
            MANAGE SHOP SCHEDULE
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={handleLogout}
      >
        <Text style={styles.secondaryText}>
          LOG OUT
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

  // LOGIN AND REGISTRATION
  const isCustomerRegistration = screen === "registerCustomer";
  const isOwnerRegistration = screen === "registerOwner";
  const isRegistration =
    isCustomerRegistration || isOwnerRegistration;

  function renderInput(
    label,
    value,
    setter,
    placeholder,
    options = {}
  ) {
    return (
      <View key={label}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#999"
          value={value}
          onChangeText={setter}
          autoCapitalize={options.autoCapitalize || "sentences"}
          autoCorrect={false}
          secureTextEntry={options.secureTextEntry || false}
          keyboardType={options.keyboardType || "default"}
        />
      </View>
    );
  }

  function renderButton(label, onPress, secondary = false) {
    return (
      <TouchableOpacity
        key={label}
        style={secondary ? styles.secondaryButton : styles.button}
        onPress={onPress}
        disabled={loading}
      >
        <Text
          style={
            secondary ? styles.secondaryText : styles.buttonText
          }
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.logo}>QueLess</Text>
      <Text style={styles.tagline}>Book smart. Wait less.</Text>

      {screen === "login" ? (
        <>
          <Text style={styles.heading}>Sign In</Text>
          <Text style={styles.description}>
            Sign in to your QueLess account.
          </Text>

          {renderInput(
            "Email Address",
            email,
            setEmail,
            "Enter your email",
            {
              autoCapitalize: "none",
              keyboardType: "email-address",
            }
          )}

          {renderInput(
            "Password",
            password,
            setPassword,
            "Enter your password",
            {
              autoCapitalize: "none",
              secureTextEntry: true,
            }
          )}

          {renderButton(
            loading ? "PLEASE WAIT..." : "SIGN IN",
            handleLogin
          )}

          {renderButton(
            "CREATE CUSTOMER ACCOUNT",
            () => goTo("registerCustomer"),
            true
          )}

          {renderButton(
            "REGISTER AS SHOP OWNER",
            () => goTo("registerOwner"),
            true
          )}
        </>
      ) : isRegistration ? (
        <>
          <Text style={styles.heading}>
            {isCustomerRegistration
              ? "Customer Registration"
              : "Shop Owner Registration"}
          </Text>

          {renderInput(
            "Full Name",
            name,
            setName,
            "Enter your full name"
          )}

          {isCustomerRegistration &&
            renderInput(
              "Age",
              age,
              setAge,
              "Enter your age",
              { keyboardType: "number-pad" }
            )}

          {renderInput(
            "Email Address",
            email,
            setEmail,
            "Enter your email",
            {
              autoCapitalize: "none",
              keyboardType: "email-address",
            }
          )}

          {renderInput(
            "Password",
            password,
            setPassword,
            "At least 6 characters and 1 capital letter",
            {
              autoCapitalize: "none",
              secureTextEntry: true,
            }
          )}

          {renderInput(
            "Confirm Password",
            confirmPassword,
            setConfirmPassword,
            "Re-enter your password",
            {
              autoCapitalize: "none",
              secureTextEntry: true,
            }
          )}

          {isOwnerRegistration && (
            <>
              {renderInput(
                "Shop Name",
                shopName,
                setShopName,
                "Enter shop name"
              )}

              {renderInput(
                "Shop Address",
                shopAddress,
                setShopAddress,
                "Enter complete shop address"
              )}

              {renderInput(
                "Contact Number",
                contactNumber,
                setContactNumber,
                "Enter contact number",
                { keyboardType: "phone-pad" }
              )}

              <Text style={styles.label}>Shop Type</Text>

              <View style={styles.choiceRow}>
                <TouchableOpacity
                  style={[
                    styles.choiceButton,
                    shopType === "Barbershop" &&
                      styles.choiceSelected,
                  ]}
                  onPress={() => setShopType("Barbershop")}
                >
                  <Text style={styles.choiceText}>
                    Barbershop
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.choiceButton,
                    shopType === "Salon" &&
                      styles.choiceSelected,
                  ]}
                  onPress={() => setShopType("Salon")}
                >
                  <Text style={styles.choiceText}>Salon</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          <Text style={styles.hint}>
            Password must contain at least 6 characters and one
            capital letter.
          </Text>

          {renderButton(
            loading
              ? "PLEASE WAIT..."
              : isCustomerRegistration
              ? "CREATE CUSTOMER ACCOUNT"
              : "CREATE OWNER AND SHOP",
            isCustomerRegistration
              ? handleCustomerRegister
              : handleOwnerRegister
          )}

          {renderButton(
            "BACK TO SIGN IN",
            () => goTo("login"),
            true
          )}
        </>
      ) : (
        <Text style={styles.description}>
          Please return to the sign-in screen.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#171717",
  },

  content: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 50,
    paddingBottom: 40,
  },

  logo: {
    color: "#D9AE55",
    fontSize: 36,
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: 2,
  },

  tagline: {
    color: "#AAAAAA",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 36,
  },

  heading: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "bold",
    marginTop: 25,
    marginBottom: 10,
  },

  description: {
    color: "#AAAAAA",
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 20,
  },

  label: {
    color: "#D9AE55",
    fontWeight: "600",
    marginTop: 15,
    marginBottom: 8,
  },

  input: {
    backgroundColor: "#252525",
    borderColor: "#444444",
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    color: "#FFFFFF",
    fontSize: 15,
  },

  hint: {
    color: "#AAAAAA",
    fontSize: 12,
    marginTop: 10,
  },

  button: {
    backgroundColor: "#D9AE55",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 18,
  },

  buttonText: {
    color: "#171717",
    fontWeight: "bold",
    letterSpacing: 1,
    textAlign: "center",
  },

  secondaryButton: {
    borderColor: "#D9AE55",
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
    marginTop: 12,
  },

  secondaryText: {
    color: "#D9AE55",
    fontWeight: "bold",
    textAlign: "center",
  },

  card: {
    backgroundColor: "#252525",
    padding: 20,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 16,
  },

  welcome: {
    color: "#D9AE55",
    fontSize: 21,
    fontWeight: "bold",
    marginBottom: 15,
  },

  detail: {
    color: "#FFFFFF",
    marginBottom: 10,
    lineHeight: 20,
  },

  shopCard: {
    backgroundColor: "#252525",
    padding: 18,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#444444",
  },

  shopName: {
    color: "#D9AE55",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },

  shopType: {
    color: "#AAAAAA",
    fontSize: 14,
    marginBottom: 12,
  },

  loader: {
    marginTop: 30,
  },

  choiceRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },

  choiceButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#555555",
    alignItems: "center",
  },

  choiceSelected: {
    backgroundColor: "#6B5428",
    borderColor: "#D9AE55",
  },

  choiceText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
