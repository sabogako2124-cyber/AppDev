import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Linking,
  KeyboardAvoidingView,
  Platform
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
    imageUrl: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=900",
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
    imageUrl: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=900",
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
    imageUrl: "https://images.unsplash.com/photo-1521590832167-7bcbda6f5f0?w=900",
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
    imageUrl: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=900",
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
    imageUrl: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=900",
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
    imageUrl: "https://images.unsplash.com/photo-1633681926022-84c23e8cb2d5?w=900",
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
 
 
// Sample haircut gallery images. Replace these URLs with your own shop photos anytime.
const HAIRCUT_STYLES = [
  {
    id: "fade",
    name: "Fade Cut",
    imageUrl: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=700"
  },
  {
    id: "buzz",
    name: "Buzz Cut",
    imageUrl: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=700"
  },
  {
    id: "pompadour",
    name: "Pompadour",
    imageUrl: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=700"
  },
  {
    id: "classic",
    name: "Classic Style",
    imageUrl: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=700"
  }
];
 
// SAMPLE REFERENCE LOCATION FOR NEAREST-SHOP SORTING
// This is a fixed Taguig reference point, NOT the phone's live GPS location.
// Replace it with the customer's actual coordinates after adding device geolocation.
const NEAREST_SORT_REFERENCE_LOCATION = {
  latitude: 14.5176,
  longitude: 121.0509
};
 
function calculateShopDistance(shop) {
  const latitude = Number(shop?.latitude);
  const longitude = Number(shop?.longitude);
 
  const hasCoordinates =
    shop?.latitude !== undefined &&
    shop?.latitude !== null &&
    shop?.latitude !== "" &&
    shop?.longitude !== undefined &&
    shop?.longitude !== null &&
    shop?.longitude !== "" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 && latitude <= 90 &&
    longitude >= -180 && longitude <= 180;
 
  if (!hasCoordinates) return Number.POSITIVE_INFINITY;
 
  const toRadians = value => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(latitude - NEAREST_SORT_REFERENCE_LOCATION.latitude);
  const dLon = toRadians(longitude - NEAREST_SORT_REFERENCE_LOCATION.longitude);
 
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(NEAREST_SORT_REFERENCE_LOCATION.latitude)) *
      Math.cos(toRadians(latitude)) *
      Math.sin(dLon / 2) ** 2;
 
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
 
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
 
    times.push(
      `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
    );
  }
 
  return times;
};
 
export default function App() {
 
  const [screen, setScreen] = useState("login");
  const [shopSearch, setShopSearch] = useState("");
  const [shopTypeFilter, setShopTypeFilter] = useState("All");
  const [sortByNearest, setSortByNearest] = useState(false);
 
  
 
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
 
  // MY APPOINTMENTS STATES
  const [myAppointments, setMyAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
 
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [appointmentFilter, setAppointmentFilter] = useState("All");
 
  // APPOINTMENT SUMMARY
  const appointmentSummary = {
    total: myAppointments.length,
 
    upcoming: myAppointments.filter(item =>
      ["pending", "confirmed"].includes(
        (item.status || "pending").toLowerCase()
      )
    ).length,
 
    inProgress: myAppointments.filter(item =>
      ["inqueue", "inservice"].includes(
        (item.status || "").toLowerCase()
      )
    ).length,
 
    completed: myAppointments.filter(item =>
      (item.status || "").toLowerCase() === "completed"
    ).length,
 
    cancelled: myAppointments.filter(item =>
      (item.status || "").toLowerCase() === "cancelled"
    ).length
  };
 
  // APPOINTMENT FILTER
  const filteredMyAppointments = myAppointments.filter(item => {
    const status = (item.status || "pending").toLowerCase();
 
    if (appointmentFilter === "Upcoming") {
      return ["pending", "confirmed"].includes(status);
    }
 
    if (appointmentFilter === "In Progress") {
      return ["inqueue", "inservice"].includes(status);
    }
 
    if (appointmentFilter === "Completed") {
      return status === "completed";
    }
 
    if (appointmentFilter === "Cancelled") {
      return status === "cancelled";
    }
 
    return true;
  });
 
  // OWNER APPOINTMENTS
  const [ownerAppointments, setOwnerAppointments] = useState([]);
  
  const [loadingOwnerAppointments, setLoadingOwnerAppointments] = useState(false);
  const [confirmingAppointmentId, setConfirmingAppointmentId] = useState(null);
 
  const [queueAppointments, setQueueAppointments] = useState([]);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [updatingQueueId, setUpdatingQueueId] = useState(null);
 
  const filteredShops = shops.filter(shop => {
  const search = shopSearch.toLowerCase();
 
 
  const matchesSearch =
    (shop.name || "").toLowerCase().includes(search) ||
    (shop.address || "").toLowerCase().includes(search);
 
  const type = (shop.type || "").toLowerCase();
 
  const matchesType =
    shopTypeFilter === "All" ||
    type.includes(shopTypeFilter.toLowerCase());
 
  return matchesSearch && matchesType;
});
 
  const displayedShops = sortByNearest
    ? [...filteredShops].sort(
        (a, b) => calculateShopDistance(a) - calculateShopDistance(b)
      )
    : filteredShops;
 
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
      Alert.alert(
        "Invalid Password",
        "Use at least 6 characters and one capital letter."
      );
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
 
    if (
      !age.trim() ||
      !Number.isInteger(Number(age)) ||
      Number(age) < 15
    ) {
      Alert.alert("Invalid Age", "Enter an age of 15 or older.");
      return;
    }
 
    setLoading(true);
 
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
 
      await updateProfile(cred.user, {
        displayName: name.trim()
      });
 
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
 
      Alert.alert(
        "Success",
        "Customer account created. You can now sign in."
      );
    } catch (e) {
      console.error("Customer registration error:", e);
 
      Alert.alert(
        "Registration Failed",
        e.code === "auth/email-already-in-use"
          ? "This email is already registered."
          : e.message || "Please try again."
      );
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
      const cred = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
 
      await updateProfile(cred.user, {
        displayName: name.trim()
      });
 
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
 
      Alert.alert(
        "Registration Submitted",
        "Your owner account is pending admin approval. You can sign in after your account has been approved."
      );
    } catch (e) {
      console.error("Owner registration error:", e);
 
      if (auth.currentUser) {
        try {
          await signOut(auth);
        } catch (signOutError) {
          console.error("Sign-out error:", signOutError);
        }
      }
 
      Alert.alert(
        "Registration Failed",
        e.code === "auth/email-already-in-use"
          ? "This email is already registered."
          : e.message || "Please check your information and try again."
      );
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
    const cred = await signInWithEmailAndPassword(
      auth,
      email.trim(),
      password
    );
 
    console.log("LOGIN: Authentication successful");
 
    // CHECK USER DOCUMENT
    console.log("LOGIN: Checking user document...");
 
    const snap = await getDoc(
      doc(db, "users", cred.user.uid)
    );
 
    console.log("LOGIN: User document result:", snap.exists());
 
    if (!snap.exists()) {
      await signOut(auth);
      Alert.alert("Profile Not Found", "Your user profile was not found.");
      return;
    }
 
    const data = snap.data();
 
    console.log("LOGIN: Role:", data.role);
    console.log("LOGIN: Status:", data.status);
 
    if (data.status !== "active") {
      await signOut(auth);
 
      if (data.role === "owner" && data.status === "pending") {
        Alert.alert(
          "Pending Admin Approval",
          "Your owner account is waiting for admin approval."
        );
      } else {
        Alert.alert("Account Disabled", "Your account is not active.");
      }
 
      return;
    }
 
    const signedUser = {
      ...data,
      uid: cred.user.uid
    };
 
    if (data.role === "customer") {
      setCurrentUser(signedUser);
      setScreen("customerDashboard");
      await handleLoadHomeShops();
 
    } else if (data.role === "owner") {
 
      // CHECK ESTABLISHMENT DOCUMENT
      console.log("LOGIN: Checking establishment document...");
 
      const shopSnap = await getDoc(
        doc(db, "establishments", cred.user.uid)
      );
 
      console.log(
        "LOGIN: Establishment document result:",
        shopSnap.exists()
      );
 
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
    console.error("Login error:", e);
 
    Alert.alert(
      "Login Failed",
      `${e.code || ""}: ${e.message || "Please try again."}`
    );
 
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
      console.error("Logout error:", e);
      Alert.alert("Error", "Unable to log out.");
    }
  }
 
  // CUSTOMER: VIEW APPOINTMENT DETAILS
// VIEW APPOINTMENT DETAILS
function handleViewAppointmentDetails(item) {
  setSelectedAppointment(item);
 
  if (currentUser?.role === "owner") {
    setScreen("ownerAppointmentDetails");
  } else {
    setScreen("appointmentDetails");
  }
}
 
// CUSTOMER: LOAD APPOINTMENTS
async function handleLoadMyAppointments() {
  if (!currentUser?.uid) return;
 
  setLoadingAppointments(true);
  setMyAppointments([]);
  setScreen("myAppointments");
 
  try {
    const q = query(
      collection(db, "appointments"),
      where("customerId", "==", currentUser.uid)
    );
 
    const snap = await getDocs(q);
 
    const bookings = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));
 
    bookings.sort((a, b) => {
      const dateA = `${a.date || ""} ${a.time || ""}`;
      const dateB = `${b.date || ""} ${b.time || ""}`;
      return dateA.localeCompare(dateB);
    });
 
    setMyAppointments(bookings);
  } catch (e) {
    console.error("Load appointments error:", e);
 
    Alert.alert(
      "Unable to Load Appointments",
      e.message || "Please check your internet connection and Firestore rules."
    );
  } finally {
    setLoadingAppointments(false);
  }
}
 
// OWNER: LOAD PENDING APPOINTMENTS
async function handleLoadOwnerAppointments() {
  if (!currentUser?.uid || currentUser.role !== "owner") {
    Alert.alert("Access Denied", "Only shop owners can view appointments.");
    return;
  }
 
  setLoadingOwnerAppointments(true);
  setOwnerAppointments([]);
  setScreen("ownerAppointments");
 
  try {
    const q = query(
      collection(db, "appointments"),
      where("establishmentId", "==", currentUser.uid),
      where("status", "==", "pending")
    );
 
    const snap = await getDocs(q);
 
    const bookings = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));
 
    bookings.sort((a, b) => {
      const dateA = `${a.date || ""} ${a.time || ""}`;
      const dateB = `${b.date || ""} ${b.time || ""}`;
      return dateA.localeCompare(dateB);
    });
 
    setOwnerAppointments(bookings);
  } catch (e) {
    console.error("Load owner appointments error:", e);
    Alert.alert("Unable to Load Appointments", e.message || "Please try again.");
  } finally {
    setLoadingOwnerAppointments(false);
  }
}
 
// OWNER: LOAD QUEUE
async function handleLoadQueue() {
  if (!currentUser?.uid || currentUser.role !== "owner") {
    Alert.alert("Access Denied", "Only shop owners can manage the queue.");
    return;
  }
 
  setLoadingQueue(true);
  setQueueAppointments([]);
  setScreen("ownerQueue");
 
  try {
    const q = query(
      collection(db, "appointments"),
      where("establishmentId", "==", currentUser.uid)
    );
 
    const snap = await getDocs(q);
 
    const bookings = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(item =>
        ["confirmed", "inQueue", "inService"].includes(item.status)
      );
 
    bookings.sort((a, b) => {
      const dateA = `${a.date || ""} ${a.time || ""}`;
      const dateB = `${b.date || ""} ${b.time || ""}`;
      return dateA.localeCompare(dateB);
    });
 
    setQueueAppointments(bookings);
  } catch (e) {
    console.error("Load queue error:", e);
    Alert.alert("Unable to Load Queue", e.message || "Please try again.");
  } finally {
    setLoadingQueue(false);
  }
}
 
// OWNER: UPDATE QUEUE STATUS
 
 
async function handleUpdateQueueStatus(item, nextStatus) {
  console.log("HANDLE UPDATE QUEUE STATUS CALLED");
  console.log("APPOINTMENT:", item?.id);
  console.log("NEXT STATUS:", nextStatus);
 
  if (!currentUser?.uid || !item?.id) return;
 
  setUpdatingQueueId(item.id);
 
  try {
    const appointmentRef = doc(db, "appointments", item.id);
    let lockRefs = [];
 
    // Find all locks belonging to this appointment
    if (nextStatus === "completed") {
      const lockQuery = query(
        collection(db, "slotLocks"),
        where("appointmentId", "==", item.id)
      );
 
      const lockSnap = await getDocs(lockQuery);
 
      console.log("COMPLETING APPOINTMENT ID:", item.id);
      console.log("LOCKS FOUND:", lockSnap.size);
 
      lockSnap.docs.forEach(lockDoc => {
        console.log("LOCK DOCUMENT:", lockDoc.id, lockDoc.data());
      });
 
      lockRefs = lockSnap.docs.map(lockDoc => lockDoc.ref);
    }
 
    // Update appointment and delete its locks
    await runTransaction(db, async transaction => {
      const appointmentSnap = await transaction.get(appointmentRef);
 
      if (!appointmentSnap.exists()) {
        throw new Error("APPOINTMENT_NOT_FOUND");
      }
 
      const appointment = appointmentSnap.data();
 
      if (appointment.establishmentId !== currentUser.uid) {
        throw new Error("NOT_YOUR_SHOP");
      }
 
      const allowedTransitions = {
        confirmed: "inQueue",
        inQueue: "inService",
        inService: "completed"
      };
 
      if (allowedTransitions[appointment.status] !== nextStatus) {
        throw new Error("INVALID_STATUS");
      }
 
      // Read lock documents before writing
      const lockSnapshots = await Promise.all(
        lockRefs.map(ref => transaction.get(ref))
      );
 
      transaction.update(appointmentRef, {
        status: nextStatus,
        queueUpdatedAt: serverTimestamp()
      });
 
      if (nextStatus === "completed") {
        let deletedCount = 0;
 
        lockSnapshots.forEach((lockSnap, index) => {
          if (
            lockSnap.exists() &&
            lockSnap.data().appointmentId === item.id &&
            lockSnap.data().establishmentId === currentUser.uid
          ) {
            console.log("DELETING LOCK:", lockRefs[index].id);
            transaction.delete(lockRefs[index]);
            deletedCount++;
          }
        });
 
        console.log("LOCKS MARKED FOR DELETION:", deletedCount);
      }
    });
 
    console.log("QUEUE TRANSACTION SUCCESSFUL:", item.id);
 
    if (nextStatus === "completed") {
      console.log("COMPLETION TRANSACTION SUCCESSFUL:", item.id);
    }
 
    await handleLoadQueue();
 
    if (nextStatus === "completed") {
      Alert.alert(
        "Service Completed",
        "Appointment completed. Its reserved time slots have been released."
      );
    }
 
  } catch (e) {
    console.error("TRANSACTION FAILED:", e.code, e.message);
    console.error("Update queue status error:", e);
 
    Alert.alert(
      "Unable to Update Queue",
      e.message || "Please try again."
    );
 
  } finally {
    setUpdatingQueueId(null);
  }
}
 
 
// OWNER: CONFIRM APPOINTMENT
async function handleConfirmAppointment(item) {
  if (!currentUser?.uid || !item?.id) return;
 
  Alert.alert(
    "Confirm Appointment",
    `Confirm ${item.customerName || "this customer's"} appointment for ${item.serviceName || "this service"}?`,
    [
      {
        text: "No",
        style: "cancel"
      },
      {
        text: "Yes, Confirm",
        onPress: async () => {
          setConfirmingAppointmentId(item.id);
 
          try {
            const appointmentRef = doc(db, "appointments", item.id);
 
            await runTransaction(db, async transaction => {
              const appointmentSnap = await transaction.get(appointmentRef);
 
              if (!appointmentSnap.exists()) {
                throw new Error("APPOINTMENT_NOT_FOUND");
              }
 
              const appointment = appointmentSnap.data();
 
              if (appointment.establishmentId !== currentUser.uid) {
                throw new Error("NOT_YOUR_SHOP");
              }
 
              if (appointment.status !== "pending") {
                throw new Error("NOT_PENDING");
              }
 
              transaction.update(appointmentRef, {
                status: "confirmed"
              });
            });
 
            Alert.alert(
              "Appointment Confirmed",
              "The customer appointment has been confirmed."
            );
 
            await handleLoadOwnerAppointments();
          } catch (e) {
            console.error("Confirm appointment error:", e);
 
            const message =
              e.message === "APPOINTMENT_NOT_FOUND"
                ? "This appointment could not be found."
                : e.message === "NOT_YOUR_SHOP"
                ? "You cannot confirm appointments for another shop."
                : e.message === "NOT_PENDING"
                ? "This appointment is no longer pending."
                : e.message || "Please try again.";
 
            Alert.alert("Unable to Confirm", message);
          } finally {
            setConfirmingAppointmentId(null);
          }
        }
      }
    ]
  );
}
 
  // CUSTOMER: CANCEL APPOINTMENT
  async function handleCancelAppointment(item) {
    if (!currentUser?.uid || !item?.id) return;
 
    Alert.alert(
      "Cancel Appointment",
      `Are you sure you want to cancel your appointment at ${item.shopName}?`,
      [
        {
          text: "No",
          style: "cancel"
        },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            setLoadingAppointments(true);
 
            try {
              const appointmentRef = doc(
                db,
                "appointments",
                item.id
              );
 
              const duration = Math.max(
                30,
                Number(item.durationMinutes) || 30
              );
 
              const lockTimes = makeSlotLockTimes(
                item.time,
                duration
              );
 
              const lockRefs = lockTimes.map(time =>
                doc(
                  db,
                  "slotLocks",
                  makeSlotLockId(
                    item.establishmentId,
                    item.date,
                    time
                  )
                )
              );
 
              await runTransaction(db, async transaction => {
                const appointmentSnap = await transaction.get(
                  appointmentRef
                );
 
                if (!appointmentSnap.exists()) {
                  throw new Error("APPOINTMENT_NOT_FOUND");
                }
 
                const appointment = appointmentSnap.data();
 
                if (appointment.customerId !== currentUser.uid) {
                  throw new Error("NOT_YOUR_APPOINTMENT");
                }
 
                if (
                  !["pending", "confirmed"].includes(appointment.status)
                ) {
                  throw new Error("CANNOT_CANCEL");
                }
 
                // Read all lock documents before making changes.
                const lockSnapshots = await Promise.all(
                  lockRefs.map(ref => transaction.get(ref))
                );
 
                transaction.update(appointmentRef, {
                  status: "cancelled",
                  cancelledAt: serverTimestamp()
                });
 
                lockSnapshots.forEach((snap, index) => {
                  if (
                    snap.exists() &&
                    snap.data().appointmentId === item.id
                  ) {
                    transaction.delete(lockRefs[index]);
                  }
                });
              });
 
              Alert.alert(
                "Cancelled",
                "Your appointment has been cancelled."
              );
 
              await handleLoadMyAppointments();
            } catch (e) {
              console.error("Cancel appointment error:", e);
 
              const message =
                e.message === "APPOINTMENT_NOT_FOUND"
                  ? "This appointment could not be found."
                  : e.message === "NOT_YOUR_APPOINTMENT"
                  ? "You cannot cancel someone else's appointment."
                  : e.message === "CANNOT_CANCEL"
                  ? "Only pending or confirmed appointments can be cancelled."
                  : e.message || "Please try again.";
 
              Alert.alert("Unable to Cancel", message);
              setLoadingAppointments(false);
            }
          }
        }
      ]
    );
  }
 
  // CUSTOMER: LOAD SHOPS
  async function handleLoadHomeShops() {
    setLoadingShops(true);
 
    try {
      const snap = await getDocs(
        query(
          collection(db, "establishments"),
          where("status", "==", "active")
        )
      );
 
         const realShops = snap.docs.map(d => ({
          id: d.id,
          ...d.data(),
          isDemo: false
        }));
 
        setShops([...realShops, ...DEMO_SHOPS]);
 
 
    } catch (e) {
      console.error("Load shops error:", e);
      Alert.alert("Unable to Load Shops", "Please check your connection.");
    } finally {
      setLoadingShops(false);
    }
  }
 
  // CUSTOMER: FIND SHOPS
  async function handleFindShops() {
    setScreen("shopList");
    setSortByNearest(false);
    setShops([]);
    await handleLoadHomeShops();
  }
 
 
  function handleSortByNearest() {
    const shopsWithCoordinates = filteredShops.filter(shop =>
      Number.isFinite(calculateShopDistance(shop))
    );
 
    if (shopsWithCoordinates.length === 0) {
      Alert.alert(
        "Shop Coordinates Missing",
        "Add numeric latitude and longitude fields to active shop documents in Firestore. Sorting currently uses a sample Taguig reference point, not live GPS."
      );
      return;
    }
 
    setSortByNearest(true);
    Alert.alert(
      "Shops Sorted",
      "Shops with saved coordinates are now arranged from nearest to farthest from the sample Taguig reference point."
    );
  }
  async function handleGetDirections(shop) {
    if (!shop?.address?.trim()) {
      Alert.alert("Address Missing", "This shop has no address yet.");
      return;
    }
 
    try {
      await Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${shop.name || ""}, ${shop.address}`
        )}`
      );
    } catch (e) {
      console.error("Maps error:", e);
      Alert.alert("Unable to Open Maps", "Check if a browser is available.");
    }
  }
 
  // OWNER: LOAD SERVICES
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
      const snap = await getDocs(
        collection(db, "establishments", currentUser.uid, "services")
      );
 
      setServices(
        snap.docs.map(d => ({
          id: d.id,
          ...d.data()
        }))
      );
    } catch (e) {
      console.error("Load services error:", e);
      Alert.alert("Unable to Load Services", "Check Firestore rules.");
    } finally {
      setLoadingServices(false);
    }
  }
 
// CUSTOMER: VIEW SHOP DETAILS
function handleViewShopDetails(shop) {
  setSelectedShop(shop);
  setScreen("shopDetails");
}
 
  // CUSTOMER: VIEW SHOP SERVICES
 async function handleViewShopServices(shop) {
  setSelectedShop(shop);
  setCustomerServices([]);
  setLoadingCustomerServices(true);
  setScreen("customerServices");
 
  // DEMO SHOP: use static sample services
  if (shop.isDemo) {
    setCustomerServices(shop.services || []);
    setLoadingCustomerServices(false);
    return;
  }
 
  // REAL SHOP: load services from Firestore
  try {
    const q = query(
      collection(db, "establishments", shop.id, "services"),
      where("status", "==", "active")
    );
 
    const snap = await getDocs(q);
 
    setCustomerServices(
      snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }))
    );
  } catch (e) {
    console.error("View shop services error:", e);
    Alert.alert("Unable to Load Services", "Check Firestore rules.");
  } finally {
    setLoadingCustomerServices(false);
  }
}
 
  // OWNER: SAVE SERVICE
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
 
    if (!Number.isFinite(price) || price < 0) {
      Alert.alert("Invalid Price", "Enter a valid price.");
      return;
    }
 
    if (
      !serviceDuration.trim() ||
      !Number.isInteger(duration) ||
      duration <= 0
    ) {
      Alert.alert("Invalid Duration", "Enter duration in minutes.");
      return;
    }
 
    setLoadingServices(true);
 
    try {
      const ref = collection(
        db,
        "establishments",
        currentUser.uid,
        "services"
      );
 
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
        await addDoc(ref, {
          ...item,
          createdAt: serverTimestamp()
        });
        Alert.alert("Success", "Service added.");
      }
 
      setServiceName("");
      setServiceDescription("");
      setServicePrice("");
      setServiceDuration("30");
      setEditingServiceId(null);
 
      const snap = await getDocs(ref);
 
      setServices(
        snap.docs.map(d => ({
          id: d.id,
          ...d.data()
        }))
      );
    } catch (e) {
      console.error("Save service error:", e);
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
      {
        text: "Cancel",
        style: "cancel"
      },
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
                item.id
              )
            );
 
            setServices(prev => prev.filter(s => s.id !== item.id));
          } catch (e) {
            console.error("Delete service error:", e);
            Alert.alert("Unable to Delete", "Check Firestore rules.");
          }
        }
      }
    ]);
  }
 
  // OWNER: SAVE SHOP SCHEDULE
  async function handleSaveSchedule() {
    if (!currentUser?.uid || currentUser.role !== "owner") {
      Alert.alert("Error", "Only the owner can edit the schedule.");
      return;
    }
 
    for (const [day, hours] of Object.entries(schedule)) {
      if (
        hours.open &&
        (
          !/^\d{2}:\d{2}$/.test(hours.openingTime) ||
          !/^\d{2}:\d{2}$/.test(hours.closingTime) ||
          hours.openingTime >= hours.closingTime
        )
      ) {
        Alert.alert(
          "Invalid Hours",
          `Check opening and closing times for ${day}.`
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
          scheduleUpdatedAt: serverTimestamp()
        }
      );
 
      setEstablishment(prev => ({
        ...prev,
        operatingHours: schedule
      }));
 
      Alert.alert("Success", "Shop schedule saved.");
    } catch (e) {
      console.error("Save schedule error:", e);
      Alert.alert("Unable to Save", "Check Firestore rules.");
    } finally {
      setSavingSchedule(false);
    }
  }
 
  // CUSTOMER: START BOOKING
  function handleStartBooking(item) {
  if (selectedShop?.isDemo) {
    Alert.alert(
      "Demo Shop",
      "This is a sample shop. Actual bookings are only available for registered shops."
    );
    return;
  }
 
  setSelectedService(item);
  setAppointmentDate("");
  setAppointmentTime("");
  setAvailableSlots([]);
  setOccupiedSlots([]);
  setScreen("bookAppointment");
}
 
  // CUSTOMER: LOAD AVAILABLE TIME SLOTS
 // CUSTOMER: LOAD AVAILABLE AND OCCUPIED TIME SLOTS
async function handleLoadAvailableSlots(dateString) {
  if (!selectedShop?.id || !selectedService) return;
 
  setLoadingSlots(true);
  setAvailableSlots([]);
  setOccupiedSlots([]);
  setAppointmentTime("");
 
  try {
    const date = dateFromString(dateString);
    const dayName = WEEKDAYS[date.getDay()];
 
    const shopSnap = await getDoc(
      doc(db, "establishments", selectedShop.id)
    );
 
    const shop = shopSnap.exists() ? shopSnap.data() : selectedShop;
    const hours = shop.operatingHours?.[dayName];
 
    if (!hours?.open) {
      Alert.alert(
        "Shop Closed",
        `The shop is closed on ${dayName}. Choose another date.`
      );
      return;
    }
 
    if (!hours.openingTime || !hours.closingTime) {
      Alert.alert(
        "Schedule Missing",
        "The shop owner needs to save opening and closing times."
      );
      return;
    }
 
    const [oh, om] = hours.openingTime.split(":").map(Number);
    const [ch, cm] = hours.closingTime.split(":").map(Number);
 
    const open = oh * 60 + om;
    const close = ch * 60 + cm;
 
    const duration = Math.max(
      30,
      Number(selectedService.durationMinutes) || 30
    );
 
    const available = [];
    const occupied = [];
 
    for (let start = open; start + duration <= close; start += 30) {
      const slotDate = new Date(date);
 
      slotDate.setHours(
        Math.floor(start / 60),
        start % 60,
        0,
        0
      );
 
      if (slotDate <= new Date()) continue;
 
      const startTime =
        `${String(Math.floor(start / 60)).padStart(2, "0")}:` +
        `${String(start % 60).padStart(2, "0")}`;
 
      const lockTimes = makeSlotLockTimes(startTime, duration);
 
      const lockSnapshots = await Promise.all(
        lockTimes.map(time =>
          getDoc(
            doc(
              db,
              "slotLocks",
              makeSlotLockId(selectedShop.id, dateString, time)
            )
          )
        )
      );
 
      if (lockSnapshots.some(snap => snap.exists())) {
        occupied.push(startTime);
      } else {
        available.push(startTime);
      }
    }
 
    setAvailableSlots(available);
    setOccupiedSlots(occupied);
 
    if (available.length === 0 && occupied.length === 0) {
      Alert.alert(
        "No Available Times",
        "No appointment times are available for this date."
      );
    }
 
  } catch (e) {
    console.error("Load time slots error:", e);
 
    Alert.alert(
      "Unable to Load Times",
      `${e.code || ""} ${e.message || "Check Firestore rules and shop schedule."}`
    );
 
  } finally {
    setLoadingSlots(false);
  }
}
 
  // CUSTOMER: BOOK APPOINTMENT
  async function handleBookAppointment() {
    if (!currentUser?.uid || !selectedShop?.id || !selectedService?.id) {
      Alert.alert(
        "Error",
        "Customer, shop, or service information is missing."
      );
      return;
    }
 
    if (selectedShop?.isDemo) {
  Alert.alert(
    "Demo Shop",
    "This is a sample shop. Actual bookings are only available for registered shops."
  );
  return;
}
 
    if (
      !appointmentDate ||
      !appointmentTime ||
      !availableSlots.includes(appointmentTime)
    ) {
      Alert.alert("Required", "Choose a date and an available time slot.");
      return;
    }
 
    const match = appointmentTime.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
 
    if (!match) {
      Alert.alert("Invalid Time", "Choose a valid time slot.");
      return;
    }
 
    const date = dateFromString(appointmentDate);
 
    const appointmentDateTime = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      Number(match[1]),
      Number(match[2])
    );
 
    if (appointmentDateTime <= new Date()) {
      Alert.alert("Invalid Time", "Choose a future appointment time.");
      return;
    }
 
    const duration = Math.max(
      30,
      Number(selectedService.durationMinutes) || 30
    );
 
    const lockTimes = makeSlotLockTimes(appointmentTime, duration);
 
    setBookingLoading(true);
 
    try {
      const appointmentRef = doc(collection(db, "appointments"));
 
      await runTransaction(db, async transaction => {
        const lockRefs = lockTimes.map(time =>
          doc(
            db,
            "slotLocks",
            makeSlotLockId(selectedShop.id, appointmentDate, time)
          )
        );
 
        const lockSnapshots = await Promise.all(
          lockRefs.map(ref => transaction.get(ref))
        );
 
        if (lockSnapshots.some(snap => snap.exists())) {
          throw new Error("SLOT_TAKEN");
        }
 
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
 
      Alert.alert(
        "Booking Submitted",
        "Your appointment request is pending shop confirmation."
      );
 
      setAppointmentDate("");
      setAppointmentTime("");
      setAvailableSlots([]);
      setSelectedService(null);
      setScreen("customerServices");
    } catch (e) {
      console.error("Booking failed:", e);
 
      if (e.message === "SLOT_TAKEN") {
        Alert.alert(
          "Time Just Taken",
          "Another customer booked that time. Please select another slot."
        );
 
        await handleLoadAvailableSlots(appointmentDate);
      } else {
        Alert.alert(
          "Booking Failed",
          `${e.code || ""} ${e.message || "Check your Firebase rules and connection."}`
        );
      }
    } finally {
      setBookingLoading(false);
    }
  }
 
  // REUSABLE INPUT COMPONENT
  function input(label, value, setter, placeholder, options = {}) {
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
          secureTextEntry={!!options.secureTextEntry}
          keyboardType={options.keyboardType || "default"}
        />
      </View>
    );
  }
 
  // REUSABLE BUTTON COMPONENT
  function button(label, onPress, secondary = false, disabled = false) {
    return (
      <TouchableOpacity
        key={label}
        style={[
          secondary ? styles.secondaryButton : styles.button,
          disabled && { opacity: 0.5 }
        ]}
        onPress={onPress}
        disabled={disabled}
      >
        <Text style={secondary ? styles.secondaryText : styles.buttonText}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  }
 
  // REUSABLE PAGE COMPONENT
  const page = children => (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { flexGrow: 1, paddingBottom: 100 }
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={true}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
 
  const header = title => (
    <>
      <Text style={styles.logo}>QueLess</Text>
      <Text style={styles.heading}>{title}</Text>
    </>
  );
 
  const loader = (
    <ActivityIndicator
      size="large"
      color="#D9AE55"
      style={styles.loader}
    />
  );
 
  // CUSTOMER DASHBOARD - refreshed UI using existing HAIRCUT_STYLES and shop images
  if (screen === "customerDashboard" && currentUser) {
    return page(
      <View style={styles.customerHomeV3}>
        <View style={styles.customerTopBarV3}>
          <View>
            <Text style={styles.customerBrandV3}>QUELESS</Text>
            <Text style={styles.customerWelcomeV3}>
              Welcome, {currentUser.name || "Customer"}!
            </Text>
          </View>
 
          <TouchableOpacity
            style={styles.customerProfileButtonV3}
            accessibilityRole="button"
            onPress={() => Alert.alert("Profile", "Profile page coming soon.")}
          >
            <Text style={styles.customerProfileIconV3}>👤</Text>
          </TouchableOpacity>
        </View>
 
       <View style={styles.customerHeroV3}>
  <Image
    source={{
      uri: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1200"
    }}
    style={styles.customerHeroImageV3}
    resizeMode="cover"
  />

  <View style={styles.customerHeroOverlayV3} />

  <View style={styles.customerHeroContentV3}>
    <Text style={styles.customerHeroEyebrowV3}>
      YOUR NEXT LOOK STARTS HERE
    </Text>

    <Text style={styles.customerHeroTitleV3}>
      Look good.{"\n"}Wait less.
    </Text>

    <Text style={styles.customerHeroDescriptionV3}>
      Find a barbershop or salon, choose a service, and book your appointment.
    </Text>

    <TouchableOpacity
      style={styles.customerHeroButtonV3}
      accessibilityRole="button"
      onPress={handleFindShops}
    >
      <Text style={styles.customerHeroButtonTextV3}>
        BOOK AN APPOINTMENT
      </Text>
    </TouchableOpacity>
  </View>
</View>
 
        <View style={styles.customerSectionHeaderV3}>
          <Text style={styles.customerSectionTitleV3}>Explore Haircuts</Text>
        </View>
 
        <View style={styles.customerGalleryGridV3}>
          {HAIRCUT_STYLES.map(style => (
            <View style={styles.customerGalleryTileV3} key={style.id}>
              <Image
                source={{ uri: style.imageUrl }}
                style={styles.customerGalleryImageV3}
                resizeMode="cover"
              />
              <Text style={styles.customerGalleryLabelV3}>{style.name}</Text>
            </View>
          ))}
        </View>
 
        <View style={styles.customerSectionHeaderV3}>
          <Text style={styles.customerSectionTitleV3}>Find a Shop</Text>
          <TouchableOpacity onPress={handleFindShops}>
            <Text style={styles.customerViewAllV3}>View All →</Text>
          </TouchableOpacity>
        </View>
 
        <Text style={styles.customerDescriptionV3}>
          Browse available barbershops and salons.
        </Text>
 
        {loadingShops ? (
          loader
        ) : filteredShops.length === 0 ? (
          <View style={styles.customerEmptyCardV3}>
            <Text style={styles.customerEmptyTitleV3}>No Shops Found</Text>
            <Text style={styles.customerEmptyTextV3}>
              Try another shop name, address, or category.
            </Text>
          </View>
        ) : (
          filteredShops.slice(0, 3).map(shop => (
            <TouchableOpacity
              key={shop.id}
              style={styles.customerShopCardV3}
              activeOpacity={0.85}
              onPress={() => handleViewShopDetails(shop)}
            >
              <Image
                source={{
                  uri: shop.imageUrl ||
                    "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=700"
                }}
                style={styles.customerShopImageV3}
                resizeMode="cover"
              />
              <View style={styles.customerShopInfoV3}>
                <Text style={styles.customerShopNameV3}>
                  {shop.name || "Unnamed Shop"}
                </Text>
                <Text style={styles.customerShopTypeV3}>
                  {shop.type || "Barbershop / Salon"}
                </Text>
                <Text style={styles.customerShopAddressV3} numberOfLines={2}>
                  {shop.address || "Address not provided"}
                </Text>
                <Text style={styles.customerShopLinkV3}>VIEW SHOP DETAILS →</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
 
        {button("EXPLORE ALL SHOPS", handleFindShops)}
 
        <View style={styles.customerAccountSectionV3}>
          <Text style={styles.customerSectionTitleV3}>Your Account</Text>
          {button("MY APPOINTMENTS", handleLoadMyAppointments, true)}
          {button(
            "MY PROFILE",
            () => Alert.alert("Profile", "Profile page coming soon."),
            true
          )}
          {button("LOG OUT", handleLogout, true)}
        </View>
      </View>
    );
  }
 
  // CUSTOMER MY APPOINTMENTS
if (screen === "myAppointments" && currentUser?.role === "customer") {
  const filters = [
    "All",
    "Upcoming",
    "In Progress",
    "Completed",
    "Cancelled"
  ];
 
  const getStatusColor = status => {
    switch ((status || "pending").toLowerCase()) {
      case "pending":
        return "#E6A23C";
      case "confirmed":
        return "#3B82F6";
      case "inqueue":
        return "#A78BFA";
      case "inservice":
        return "#F59E0B";
      case "completed":
        return "#22C55E";
      case "cancelled":
        return "#EF4444";
      default:
        return "#9CA3AF";
    }
  };
 
  return page(
    <>
      {header("My Appointments")}
 
 <View style={styles.card}>
  <Text style={styles.sectionTitle}>
    Appointment Summary
  </Text>
 
  <Text style={styles.detail}>
    Overview of your bookings
  </Text>
 
  <View style={{
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 15
  }}>
    {[
      {
        label: "Total",
        value: appointmentSummary.total,
        color: "#D4AF37"
      },
      {
        label: "Upcoming",
        value: appointmentSummary.upcoming,
        color: "#3B82F6"
      },
      {
        label: "In Progress",
        value: appointmentSummary.inProgress,
        color: "#A78BFA"
      },
      {
        label: "Completed",
        value: appointmentSummary.completed,
        color: "#22C55E"
      },
      {
        label: "Cancelled",
        value: appointmentSummary.cancelled,
        color: "#EF4444"
      }
    ].map(item => (
      <View
        key={item.label}
        style={{
          width: "30%",
          minWidth: 90,
          backgroundColor: "#252525",
          borderRadius: 12,
          padding: 12,
          borderLeftWidth: 3,
          borderLeftColor: item.color
        }}
      >
        <Text style={{
          color: item.color,
          fontSize: 22,
          fontWeight: "bold"
        }}>
          {item.value}
        </Text>
 
        <Text style={{
          color: "#DDD",
          fontSize: 11,
          marginTop: 4
        }}>
          {item.label}
        </Text>
      </View>
    ))}
  </View>
</View>
 
      {loadingAppointments ? (
        loader
      ) : filteredMyAppointments.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            No Appointments Found
          </Text>
 
          <Text style={styles.detail}>
            There are no appointments under the {appointmentFilter} category.
          </Text>
        </View>
      ) : (
        filteredMyAppointments.map(item => (
          <View
            style={styles.shopCard}
            key={item.id}
          >
            <View style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12
            }}>
              <Text style={styles.shopName}>
                {item.shopName || "Shop"}
              </Text>
 
              <View style={{
                backgroundColor: getStatusColor(item.status),
                paddingVertical: 5,
                paddingHorizontal: 9,
                borderRadius: 12
              }}>
                <Text style={{
                  color: "#111",
                  fontSize: 10,
                  fontWeight: "bold"
                }}>
                  {(item.status || "pending").toUpperCase()}
                </Text>
              </View>
            </View>
 
            <Text style={styles.detail}>
              Service: {item.serviceName || "Not specified"}
            </Text>
 
            <Text style={styles.detail}>
              Date: {item.date || "Not specified"}
            </Text>
 
            <Text style={styles.detail}>
              Time: {formatTime(item.time)}
            </Text>
 
            <Text style={styles.detail}>
              Price: ₱{Number(item.price || 0).toFixed(2)}
            </Text>
 
            <View style={{
              height: 1,
              backgroundColor: "#444",
              marginVertical: 12
            }} />
 
            <Text style={{
              color: "#999",
              fontSize: 11
            }}>
              Booking Reference
            </Text>
 
            <Text style={{
              color: "#D4AF37",
              fontSize: 11,
              marginTop: 4
            }}>
              {item.id}
            </Text>
 
            {button(
            "VIEW DETAILS",
            () => handleViewAppointmentDetails(item),
            true
          )}
 
            {["pending", "confirmed"].includes(
              (item.status || "").toLowerCase()
            ) && (
              <View style={{ marginTop: 14 }}>
                {button(
                  "CANCEL APPOINTMENT",
                  () => handleCancelAppointment(item),
                  true,
                  loadingAppointments
                )}
              </View>
            )}
          </View>
        ))
      )}
 
      {button(
        "REFRESH APPOINTMENTS",
        handleLoadMyAppointments,
        true,
        loadingAppointments
      )}
 
      {button(
        "BACK TO DASHBOARD",
        () => setScreen("customerDashboard"),
        true
      )}
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
 
        {button(
          "BACK TO APPOINTMENTS",
          handleLoadMyAppointments,
          true
        )}
      </>
    );
  }
 
  const status = (item.status || "pending").toLowerCase();
 
  return page(
    <>
      {header("Appointment Details")}
 
      <View style={styles.shopProfileCard}>
        <Text style={styles.shopProfileIcon}>✂️</Text>
 
        <Text style={styles.shopProfileName}>
          {item.shopName || "Shop"}
        </Text>
 
        <Text style={styles.shopProfileType}>
          {status.toUpperCase()}
        </Text>
      </View>
 
      <View style={styles.shopDetailsCard}>
        <Text style={styles.sectionTitle}>Service Information</Text>
 
        <Text style={styles.shopDetailText}>
          Service: {item.serviceName || "Not specified"}
        </Text>
 
        <Text style={styles.shopDetailText}>
          Price: ₱{Number(item.price || 0).toFixed(2)}
        </Text>
 
        <Text style={styles.shopDetailText}>
          Duration: {item.durationMinutes || 30} minutes
        </Text>
      </View>
 
      <View style={styles.shopDetailsCard}>
        <Text style={styles.sectionTitle}>Appointment Schedule</Text>
 
        <Text style={styles.shopDetailText}>
          Date: {item.date || "Not specified"}
        </Text>
 
        <Text style={styles.shopDetailText}>
          Time: {formatTime(item.time)}
        </Text>
      </View>
 
      <View style={styles.shopDetailsCard}>
        <Text style={styles.sectionTitle}>Booking Information</Text>
 
        <Text style={styles.shopDetailText}>
          Customer: {item.customerName || currentUser.name}
        </Text>
 
        <Text style={styles.shopDetailText}>
          Booking Reference:
        </Text>
 
        <Text style={{ color: "#D9AE55", fontSize: 12 }}>
          {item.id}
        </Text>
 
        <Text style={styles.shopDetailText}>
          Status: {status.toUpperCase()}
        </Text>
      </View>
 
      {["pending", "confirmed"].includes(status) &&
        button(
          "CANCEL APPOINTMENT",
          () => handleCancelAppointment(item),
          true
        )}
 
      {button(
        "BACK TO MY APPOINTMENTS",
        handleLoadMyAppointments,
        true
      )}
    </>
  );
}
 
  // CUSTOMER SHOP LIST
  if (screen === "shopList" && currentUser) {
    return page(
      <>
        {header("Find a Barbershop")}
 
        <Text style={styles.description}>
          Discover available barbershops and salons near your area.
        </Text>
 
        <TextInput
          style={styles.shopSearchInput}
          placeholder="Search shop name or address..."
          placeholderTextColor="#999999"
          value={shopSearch}
          onChangeText={setShopSearch}
        />
 
        <View style={styles.shopFilterRow}>
          {["All", "Barbershop", "Salon"].map(type => (
            <TouchableOpacity
              key={type}
              style={[
                styles.shopFilterButton,
                shopTypeFilter === type && styles.shopFilterActive
              ]}
              onPress={() => setShopTypeFilter(type)}
            >
              <Text
                style={[
                  styles.shopFilterText,
                  shopTypeFilter === type && styles.shopFilterTextActive
                ]}
              >
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
 
        <TouchableOpacity
          style={styles.nearestSortButton}
          onPress={() => {
            if (sortByNearest) {
              setSortByNearest(false);
            } else {
              handleSortByNearest();
            }
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.nearestSortButtonText}>
            {sortByNearest ? "SHOW DEFAULT ORDER" : "📍 SORT BY NEAREST SHOP"}
          </Text>
        </TouchableOpacity>
 
        {loadingShops ? (
          loader
        ) : displayedShops.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🏪</Text>
            <Text style={styles.emptyTitle}>No Shops Available</Text>
            <Text style={styles.emptyDescription}>
              There are no active shops available right now.
            </Text>
          </View>
        ) : (
          displayedShops.map(shop => (
            <TouchableOpacity
              style={styles.shopPictureCard}
              key={shop.id}
              activeOpacity={0.85}
              onPress={() => handleViewShopDetails(shop)}
            >
              <View style={styles.shopPictureDetails}>
                <Text style={styles.shopPictureName}>
                  {shop.name || "Unnamed Shop"}
                </Text>
 
                <Text style={styles.modernShopType}>
                  {shop.type || "Barbershop / Salon"}
                </Text>
 
                {shop.isDemo && (
                  <Text style={styles.demoLabel}>
                    DEMO SHOP • SAMPLE ONLY
                  </Text>
                )}
 
                <Text style={styles.modernShopDetail}>
                  📍 {shop.address || "Address not provided"}
                </Text>
 
                {Number.isFinite(calculateShopDistance(shop)) && (
                  <Text style={styles.shopDistanceText}>
                    {calculateShopDistance(shop).toFixed(2)} km from sample Taguig point
                  </Text>
                )}
 
                <Text style={styles.modernShopDetail}>
                  ☎ {shop.contactNumber || "Contact not provided"}
                </Text>
 
                <TouchableOpacity
                  style={styles.outlineAction}
                  onPress={() => handleViewShopServices(shop)}
                >
                  <Text style={styles.outlineActionText}>
                    VIEW SERVICES →
                  </Text>
                </TouchableOpacity>
              </View>
 
              <Image
                source={{
                  uri:
                    shop.imageUrl ||
                    "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=700"
                }}
                style={styles.shopImageRight}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))
        )}
 
        {button(
          "BACK TO DASHBOARD",
          () => setScreen("customerDashboard"),
          true
        )}
      </>
    );
  }
 
// CUSTOMER SHOP DETAILS
if (screen === "shopDetails" && currentUser) {
  const shopHours = selectedShop?.operatingHours || DEFAULT_SCHEDULE;
 
  return page(
    <>
      {header("Shop Details")}
 
      <Image
        source={{
          uri:
            selectedShop?.imageUrl ||
            "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1000"
        }}
        style={styles.mainShopImage}
        resizeMode="cover"
      />
 
      <View style={styles.shopProfileCard}>
        <Text style={styles.shopProfileName}>
          {selectedShop?.name || "Shop Name"}
        </Text>
 
        <Text style={styles.shopProfileType}>
          {selectedShop?.type || "Barbershop / Salon"}
        </Text>
 
        {selectedShop?.isDemo && (
          <Text style={styles.demoLabel}>DEMO SHOP • SAMPLE ONLY</Text>
        )}
      </View>
 
      <Text style={styles.sectionTitle}>Haircut Styles Gallery</Text>
      <Text style={styles.galleryDescription}>
        Browse sample haircut styles offered as inspiration.
      </Text>
 
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.carouselContainer}
      >
        {HAIRCUT_STYLES.map(style => (
          <View style={styles.carouselCard} key={style.id}>
            <Image
              source={{ uri: style.imageUrl }}
              style={styles.carouselImage}
              resizeMode="cover"
            />
            <Text style={styles.carouselText}>{style.name}</Text>
          </View>
        ))}
      </ScrollView>
 
      <View style={styles.shopDetailsCard}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
 
        <Text style={styles.shopDetailText}>
          📍 Address: {selectedShop?.address || "Not provided"}
        </Text>
 
        <Text style={styles.shopDetailText}>
          ☎ Contact: {selectedShop?.contactNumber || "Not provided"}
        </Text>
 
        {button(
          "OPEN LOCATION IN GOOGLE MAPS",
          () => handleGetDirections(selectedShop)
        )}
      </View>
 
      <View style={styles.shopDetailsCard}>
        <Text style={styles.sectionTitle}>Operating Hours</Text>
 
        {DAYS.map(day => {
          const hours = shopHours[day];
 
          return (
            <View style={styles.hoursRow} key={day}>
              <Text style={styles.hoursDay}>{day}</Text>
 
              <Text style={styles.hoursValue}>
                {!hours || !hours.open
                  ? "Closed"
                  : `${formatTime(hours.openingTime)} - ${formatTime(hours.closingTime)}`}
              </Text>
            </View>
          );
        })}
      </View>
 
      {button(
        "VIEW AVAILABLE SERVICES",
        () => handleViewShopServices(selectedShop)
      )}
 
      {button(
        "BACK TO SHOPS",
        () => setScreen("shopList"),
        true
      )}
    </>
  );
}
 
  // CUSTOMER SHOP SERVICES
  if (screen === "customerServices" && currentUser) {
    return page(
      <>
        {header("Our Services")}
 
        <View style={styles.shopProfileCard}>
          <Text style={styles.shopProfileIcon}>✂️</Text>
 
          <Text style={styles.shopProfileName}>
            {selectedShop?.name || "Selected Shop"}
          </Text>
 
          <Text style={styles.shopProfileType}>
            {selectedShop?.type || "Barbershop / Salon"}
          </Text>
 
                {selectedShop?.isDemo && (
        <Text style={{ color: "#B8860B", fontWeight: "bold", marginTop: 6 }}>
               DEMO SHOP • SAMPLE ONLY
            </Text>
            )}
 
          <Text style={styles.shopProfileDetail}>
            📍 {selectedShop?.address || "Not provided"}
          </Text>
 
          <Text style={styles.shopProfileDetail}>
            ☎ {selectedShop?.contactNumber || "Not provided"}
          </Text>
        </View>
 
        <Text style={styles.sectionTitle}>Available Services</Text>
 
        <Text style={styles.description}>
          Choose a service that you want to book.
        </Text>
 
        {loadingCustomerServices ? (
          loader
        ) : customerServices.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>💈</Text>
            <Text style={styles.emptyTitle}>No Services Yet</Text>
            <Text style={styles.emptyDescription}>
              This shop has not added any active services.
            </Text>
          </View>
        ) : (
          customerServices.map(item => (
            <View style={styles.modernServiceCard} key={item.id}>
              <View style={styles.serviceTopRow}>
                <View style={styles.serviceIconBox}>
                  <Text style={styles.serviceIcon}>✂️</Text>
                </View>
 
                <View style={{ flex: 1 }}>
                  <Text style={styles.modernServiceName}>
                    {item.name || "Unnamed Service"}
                  </Text>
 
                  <Text style={styles.serviceSubtitle}>
                  {item.description || "No description available."}
                  </Text>
 
                  
                </View>
              </View>
 
              <View style={styles.serviceInfoRow}>
                <View>
                  <Text style={styles.infoLabel}>PRICE</Text>
                  <Text style={styles.servicePrice}>
                    ₱{Number(item.price || 0).toFixed(2)}
                  </Text>
                </View>
 
                <View>
                  <Text style={styles.infoLabel}>DURATION</Text>
                  <Text style={styles.serviceDuration}>
                    {item.durationMinutes || 30} minutes
                  </Text>
                </View>
              </View>
 
              <TouchableOpacity
                style={styles.bookServiceButton}
                onPress={() => handleStartBooking(item)}
              >
                <Text style={styles.bookServiceText}>
                  BOOK THIS SERVICE →
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}
 
        {button(
          "BACK TO SHOPS",
          () => setScreen("shopList"),
          true
        )}
      </>
    );
  }
 
  // CUSTOMER BOOK APPOINTMENT SCREEN
  if (screen === "bookAppointment" && currentUser) {
    return page(
      <>
        {header("Book Appointment")}
 
        <View style={styles.card}>
          <Text style={styles.shopName}>
            {selectedShop?.name || "Selected Shop"}
          </Text>
 
          <Text style={styles.detail}>
            Service: {selectedService?.name || ""}
          </Text>
 
          <Text style={styles.detail}>
            Price: ₱{Number(selectedService?.price || 0).toFixed(2)}
          </Text>
 
          <Text style={styles.detail}>
            Duration: {selectedService?.durationMinutes || 30} minutes
          </Text>
 
          <Text style={styles.label}>Appointment Date</Text>
 
          <TouchableOpacity
            style={styles.input}
            onPress={() => setDatePickerVisible(true)}
          >
            <Text
              style={
                appointmentDate
                  ? styles.detail
                  : styles.placeholderText
              }
            >
              {appointmentDate
                ? dateFromString(appointmentDate).toLocaleDateString()
                : "Select appointment date  ▾"}
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
  <Text style={styles.hint}>
    Select a date first to see appointment times.
  </Text>
) : loadingSlots ? (
  loader
) : availableSlots.length === 0 && occupiedSlots.length === 0 ? (
  <Text style={styles.hint}>
    No appointment times available. Try another date.
  </Text>
) : (
  <View style={styles.choiceRowWrap}>
 
    {availableSlots.map(slot => (
      <TouchableOpacity
        key={slot}
        style={[
          styles.choiceButton,
          styles.slotButton,
          styles.availableSlot,
          appointmentTime === slot && styles.choiceSelected
        ]}
        onPress={() => setAppointmentTime(slot)}
      >
        <Text style={styles.choiceText}>
          {formatTime(slot)}
        </Text>
        <Text style={styles.slotStatusText}>Available</Text>
      </TouchableOpacity>
    ))}
 
    {occupiedSlots.map(slot => (
      <TouchableOpacity
        key={slot}
        style={[
          styles.choiceButton,
          styles.slotButton,
          styles.occupiedSlot
        ]}
        disabled={true}
      >
        <Text style={styles.choiceText}>
          {formatTime(slot)}
        </Text>
        <Text style={styles.slotStatusText}>Booked</Text>
      </TouchableOpacity>
    ))}
 
  </View>
)}
 
          <Text style={styles.hint}>
            Your request remains pending until the shop confirms it.
          </Text>
 
          {button(
            bookingLoading ? "SUBMITTING..." : "CONFIRM BOOKING",
            handleBookAppointment,
            false,
            bookingLoading || loadingSlots
          )}
 
          {button(
            "BACK TO SERVICES",
            () => setScreen("customerServices"),
            true,
            bookingLoading
          )}
        </View>
      </>
    );
  }
 
  // OWNER APPOINTMENT DETAILS
if (
  screen === "ownerAppointmentDetails" &&
  currentUser?.role === "owner"
) {
  const item = selectedAppointment;
 
  if (!item || item.establishmentId !== currentUser.uid) {
    return page(
      <>
        {header("Appointment Details")}
 
        <Text style={styles.detail}>
          Appointment not found or access denied.
        </Text>
 
        {button(
          "BACK TO PENDING APPOINTMENTS",
          handleLoadOwnerAppointments,
          true
        )}
      </>
    );
  }
 
  const status = (item.status || "pending").toLowerCase();
 
  return page(
    <>
      {header("Appointment Details")}
 
      <View style={styles.shopProfileCard}>
        <Text style={styles.shopProfileIcon}>📅</Text>
 
        <Text style={styles.shopProfileName}>
          {item.customerName || "Customer"}
        </Text>
 
        <Text style={styles.shopProfileType}>
          {status.toUpperCase()}
        </Text>
      </View>
 
      <View style={styles.shopDetailsCard}>
        <Text style={styles.sectionTitle}>
          Customer Information
        </Text>
 
        <Text style={styles.shopDetailText}>
          Name: {item.customerName || "Not provided"}
        </Text>
 
        <Text style={styles.shopDetailText}>
          Email: {item.customerEmail || "Not provided"}
        </Text>
      </View>
 
      <View style={styles.shopDetailsCard}>
        <Text style={styles.sectionTitle}>
          Service Information
        </Text>
 
        <Text style={styles.shopDetailText}>
          Shop: {item.shopName || "Not specified"}
        </Text>
 
        <Text style={styles.shopDetailText}>
          Service: {item.serviceName || "Not specified"}
        </Text>
 
        <Text style={styles.shopDetailText}>
          Price: ₱{Number(item.price || 0).toFixed(2)}
        </Text>
 
        <Text style={styles.shopDetailText}>
          Duration: {item.durationMinutes || 30} minutes
        </Text>
      </View>
 
      <View style={styles.shopDetailsCard}>
        <Text style={styles.sectionTitle}>
          Appointment Schedule
        </Text>
 
        <Text style={styles.shopDetailText}>
          Date: {item.date || "Not specified"}
        </Text>
 
        <Text style={styles.shopDetailText}>
          Time: {formatTime(item.time)}
        </Text>
      </View>
 
      <View style={styles.shopDetailsCard}>
        <Text style={styles.sectionTitle}>
          Booking Information
        </Text>
 
        <Text style={styles.shopDetailText}>
          Booking Reference:
        </Text>
 
        <Text style={{
          color: "#D9AE55",
          fontSize: 12,
          marginTop: 5
        }}>
          {item.id}
        </Text>
 
        <Text style={styles.shopDetailText}>
          Status: {status.toUpperCase()}
        </Text>
      </View>
 
      {status === "pending" &&
        button(
          confirmingAppointmentId === item.id
            ? "CONFIRMING..."
            : "CONFIRM APPOINTMENT",
          () => handleConfirmAppointment(item),
          false,
          confirmingAppointmentId !== null
        )}
 
      {button(
        "BACK TO PENDING APPOINTMENTS",
        handleLoadOwnerAppointments,
        true
      )}
    </>
  );
}
 
// OWNER QUEUE MANAGEMENT
if (screen === "ownerQueue" && currentUser?.role === "owner") {
  return page(
    <>
      {header("Manage Queue")}
 
      <Text style={styles.description}>
        Manage confirmed appointments according to their scheduled date and time.
      </Text>
 
      {loadingQueue ? (
        loader
      ) : queueAppointments.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.emptyTitle}>
            No Customers in Queue
          </Text>
 
          <Text style={styles.emptyDescription}>
            Confirmed appointments will appear here.
          </Text>
        </View>
      ) : (
        queueAppointments.map((item, index) => (
          <View style={styles.shopCard} key={item.id}>
            <Text style={styles.shopName}>
              Queue #{index + 1} — {item.customerName || "Customer"}
            </Text>
 
            <Text style={styles.detail}>
              Service: {item.serviceName || "Not specified"}
            </Text>
 
            <Text style={styles.detail}>
              Date: {item.date || "Not specified"}
            </Text>
 
            <Text style={styles.detail}>
              Time: {formatTime(item.time)}
            </Text>
 
            <Text style={styles.detail}>
              Duration: {item.durationMinutes || 30} minutes
            </Text>
 
            <Text style={styles.detail}>
              Status: {(item.status || "").toUpperCase()}
            </Text>
 
            {item.status === "confirmed" &&
              button(
                updatingQueueId === item.id
                  ? "UPDATING..."
                  : "ADD TO QUEUE",
                () => handleUpdateQueueStatus(item, "inQueue"),
                false,
                updatingQueueId !== null
              )}
 
            {item.status === "inQueue" &&
              button(
                updatingQueueId === item.id
                  ? "UPDATING..."
                  : "START SERVICE",
                () => handleUpdateQueueStatus(item, "inService"),
                false,
                updatingQueueId !== null
              )}
 
            {item.status === "inService" &&
              button(
                updatingQueueId === item.id
                  ? "UPDATING..."
                  : "MARK AS COMPLETED",
                () => handleUpdateQueueStatus(item, "completed"),
                false,
                updatingQueueId !== null
              )}
          </View>
        ))
      )}
 
      {button(
        "REFRESH QUEUE",
        handleLoadQueue,
        true,
        loadingQueue || updatingQueueId !== null
      )}
 
      {button(
        "BACK TO DASHBOARD",
        () => setScreen("ownerDashboard"),
        true
      )}
    </>
  );
}
 
    // OWNER PENDING APPOINTMENTS
if (screen === "ownerAppointments" && currentUser?.role === "owner") {
  return page(
    <>
      {header("Pending Appointments")}
 
      <Text style={styles.description}>
        Review appointment requests from customers and confirm their bookings.
      </Text>
 
      {loadingOwnerAppointments ? (
        loader
      ) : ownerAppointments.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.emptyTitle}>
            No Pending Appointments
          </Text>
 
          <Text style={styles.emptyDescription}>
            New customer booking requests will appear here.
          </Text>
        </View>
      ) : (
        ownerAppointments.map(item => (
          <View style={styles.shopCard} key={item.id}>
            <Text style={styles.shopName}>
              {item.customerName || "Customer"}
            </Text>
 
            <Text style={styles.detail}>
              Service: {item.serviceName || "Not specified"}
            </Text>
 
            <Text style={styles.detail}>
              Date: {item.date || "Not specified"}
            </Text>
 
            <Text style={styles.detail}>
              Time: {formatTime(item.time)}
            </Text>
 
            <Text style={styles.detail}>
              Price: ₱{Number(item.price || 0).toFixed(2)}
            </Text>
 
            <Text style={styles.detail}>
              Customer Email: {item.customerEmail || "Not provided"}
            </Text>
 
            <Text style={styles.detail}>
              Booking Reference: {item.id}
            </Text>
 
            <Text style={styles.detail}>
              Status: PENDING
            </Text>
 
              {button(
              "VIEW DETAILS",
              () => handleViewAppointmentDetails(item),
                true
              )}
 
            {button(
              confirmingAppointmentId === item.id
                ? "CONFIRMING..."
                : "CONFIRM APPOINTMENT",
              () => handleConfirmAppointment(item),
              false,
              confirmingAppointmentId !== null || loadingOwnerAppointments
            )}
          </View>
        ))
      )}
 
      {button(
        "REFRESH APPOINTMENTS",
        handleLoadOwnerAppointments,
        true,
        loadingOwnerAppointments || confirmingAppointmentId !== null
      )}
 
      {button(
        "BACK TO DASHBOARD",
        () => setScreen("ownerDashboard"),
        true
      )}
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
          {input(
            "Service Name",
            serviceName,
            setServiceName,
            "Example: Haircut"
          )}
 
          {input(
            "Price (PHP)",
            servicePrice,
            setServicePrice,
            "Example: 100",
            { keyboardType: "decimal-pad" }
          )}
 
          {input(
            "Duration (minutes)",
            serviceDuration,
            setServiceDuration,
            "Example: 30",
            { keyboardType: "number-pad" }
          )}
 
          {button(
            loadingServices
              ? "PLEASE WAIT..."
              : editingServiceId
              ? "UPDATE SERVICE"
              : "ADD SERVICE",
            handleSaveService,
            false,
            loadingServices
          )}
 
          {editingServiceId &&
            button(
              "CANCEL EDIT",
              () => {
                setEditingServiceId(null);
                setServiceName("");
                setServiceDescription("");
                setServicePrice("");
                setServiceDuration("30");
              },
              true
            )}
        </View>
 
        <Text style={styles.heading}>Your Services</Text>
 
        {loadingServices ? (
          loader
        ) : services.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.detail}>No services added yet.</Text>
          </View>
        ) : (
          services.map(item => (
            <View style={styles.shopCard} key={item.id}>
              <Text style={styles.shopName}>{item.name}</Text>
              <Text style={styles.detail}>
              Description: {item.description || "No description provided."}
              </Text>
 
              <Text style={styles.detail}>
                Price: ₱{Number(item.price).toFixed(2)}
              </Text>
 
              <Text style={styles.detail}>
                Duration: {item.durationMinutes} minutes
              </Text>
 
              <Text style={styles.detail}>
                Status: {item.status}
              </Text>
 
              {button("EDIT SERVICE", () => handleEditService(item))}
              {button(
                "DELETE SERVICE",
                () => handleDeleteService(item),
                true
              )}
            </View>
          ))
        )}
 
        {button(
          "BACK TO DASHBOARD",
          () => setScreen("ownerDashboard"),
          true
        )}
      </>
    );
  }
 
  // OWNER MANAGE SHOP SCHEDULE
  if (screen === "manageSchedule" && currentUser?.role === "owner") {
    return page(
      <>
        {header("Manage Shop Schedule")}
 
        <Text style={styles.description}>
          Set the days and hours when your shop accepts appointments.
        </Text>
 
        {DAYS.map(day => {
          const hours = schedule[day] || DEFAULT_SCHEDULE[day];
 
          return (
            <View style={styles.shopCard} key={day}>
              <Text style={styles.shopName}>{day}</Text>
 
              {button(
                hours.open
                  ? "OPEN — TAP TO CLOSE"
                  : "CLOSED — TAP TO OPEN",
                () =>
                  setSchedule(prev => ({
                    ...prev,
                    [day]: {
                      ...hours,
                      open: !hours.open
                    }
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
                    <Text style={styles.detail}>
                      {formatTime(hours.openingTime)} ▾
                    </Text>
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
                    <Text style={styles.detail}>
                      {formatTime(hours.closingTime)} ▾
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
              const [h, m] = (
                schedule[scheduleDay]?.[timePickerField] || "09:00"
              ).split(":").map(Number);
 
              const d = new Date();
              d.setHours(h, m, 0, 0);
              return d;
            })()}
            onChange={(event, selected) => {
              setTimePickerVisible(false);
 
              if (event.type !== "set" || !selected) return;
 
              const value =
                `${String(selected.getHours()).padStart(2, "0")}:` +
                `${String(selected.getMinutes()).padStart(2, "0")}`;
 
              setSchedule(prev => ({
                ...prev,
                [scheduleDay]: {
                  ...prev[scheduleDay],
                  [timePickerField]: value
                }
              }));
            }}
          />
        )}
 
        {button(
          savingSchedule ? "SAVING..." : "SAVE SHOP SCHEDULE",
          handleSaveSchedule,
          false,
          savingSchedule
        )}
 
        {button(
          "BACK TO DASHBOARD",
          () => setScreen("ownerDashboard"),
          true
        )}
      </>
    );
  }
 
  // OWNER DASHBOARD - card grid layout adapted from Classmate #3
  if (screen === "ownerDashboard" && currentUser?.role === "owner") {
    const ownerActions = [
      ["☷", "Manage Queue", handleLoadQueue],
      ["▦", "Pending Appointments", handleLoadOwnerAppointments],
      ["✂", "Manage Services", handleLoadServices],
      ["◷", "Shop Schedule", () => setScreen("manageSchedule")]
    ];
 
    return page(
      <View style={styles.ownerDashboardV3}>
        <Text style={styles.ownerBrandV3}>Que<Text style={styles.ownerBrandLightV3}>Less</Text></Text>
        <Text style={styles.ownerDashboardTitleV3}>Shop Owner Dashboard</Text>
 
        <View style={styles.ownerProfileCardV3}>
          <View style={styles.ownerAvatarV3}>
            <Text style={styles.ownerAvatarTextV3}>💈</Text>
          </View>
          <View style={styles.ownerProfileDetailsV3}>
            <Text style={styles.ownerShopNameV3}>
              {establishment?.name || currentUser.name || "Shop Owner"}
            </Text>
            <Text style={styles.ownerMutedV3}>{currentUser.email}</Text>
            <Text style={styles.ownerMutedV3}>Account: Shop Owner</Text>
          </View>
        </View>
 
        <View style={styles.ownerContactCardV3}>
          <Text style={styles.ownerContactTextV3}>
            📍 {establishment?.address || "Address not provided"}
          </Text>
          <Text style={styles.ownerContactTextV3}>
            ☎ {establishment?.contactNumber || "Contact not provided"}
          </Text>
          <TouchableOpacity
            style={styles.ownerMapLinkV3}
            onPress={() => handleGetDirections(establishment || {})}
          >
            <Text style={styles.ownerMapLinkTextV3}>VIEW SHOP ON MAP →</Text>
          </TouchableOpacity>
        </View>
 
        <Text style={styles.ownerSectionTitleV3}>Shop Management</Text>
        <View style={styles.ownerGridV3}>
          {ownerActions.map(([icon, label, action]) => (
            <TouchableOpacity
              key={label}
              style={styles.ownerTileV3}
              accessibilityRole="button"
              onPress={action}
            >
              <Text style={styles.ownerTileIconV3}>{icon}</Text>
              <Text style={styles.ownerTileLabelV3}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
 
        {button("LOG OUT", handleLogout, true)}
      </View>
    );
  }
 
  // REGISTRATION SCREEN CHECKS
  const isCustomerRegistration = screen === "registerCustomer";
  const isOwnerRegistration = screen === "registerOwner";
 
  // LOGIN SCREEN
  if (screen === "login") {
    return page(
      <>
        <Text style={styles.logo}>QueLess</Text>
 
        <Text style={styles.tagline}>
          Book smart. Wait less.
        </Text>
 
        <Text style={styles.heading}>Sign In</Text>
 
        <Text style={styles.description}>
          Sign in to your QueLess account.
        </Text>
 
        {input(
          "Email Address",
          email,
          setEmail,
          "Enter your email",
          {
            autoCapitalize: "none",
            keyboardType: "email-address"
          }
        )}
 
        {input(
          "Password",
          password,
          setPassword,
          "Enter your password",
          {
            autoCapitalize: "none",
            secureTextEntry: true
          }
        )}
 
        {button(
          loading ? "PLEASE WAIT..." : "SIGN IN",
          handleLogin,
          false,
          loading
        )}
 
        {button(
          "CREATE CUSTOMER ACCOUNT",
          () => goTo("registerCustomer"),
          true
        )}
 
        {button(
          "REGISTER AS SHOP OWNER",
          () => goTo("registerOwner"),
          true
        )}
      </>
    );
  }
 
  // CUSTOMER AND OWNER REGISTRATION
  if (isCustomerRegistration || isOwnerRegistration) {
    return page(
      <>
        <Text style={styles.logo}>QueLess</Text>
 
        <Text style={styles.heading}>
          {isCustomerRegistration
            ? "Customer Registration"
            : "Shop Owner Registration"}
        </Text>
 
        {input(
          "Full Name",
          name,
          setName,
          "Enter your full name"
        )}
 
        {isCustomerRegistration &&
          input(
            "Age",
            age,
            setAge,
            "Enter your age",
            { keyboardType: "number-pad" }
          )}
 
        {input(
          "Email Address",
          email,
          setEmail,
          "Enter your email",
          {
            autoCapitalize: "none",
            keyboardType: "email-address"
          }
        )}
 
        {input(
          "Password",
          password,
          setPassword,
          "At least 6 characters and 1 capital letter",
          {
            autoCapitalize: "none",
            secureTextEntry: true
          }
        )}
 
        {input(
          "Confirm Password",
          confirmPassword,
          setConfirmPassword,
          "Re-enter your password",
          {
            autoCapitalize: "none",
            secureTextEntry: true
          }
        )}
 
        {isOwnerRegistration && (
          <>
            
            {input(
              "Shop Name",
              shopName,
              setShopName,
              "Enter shop name"
            )}
 
            {input(
              "Shop Address",
              shopAddress,
              setShopAddress,
              "Enter complete shop address"
            )}
 
            {input(
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
                  shopType === "Barbershop" && styles.choiceSelected
                ]}
                onPress={() => setShopType("Barbershop")}
              >
                <Text style={styles.choiceText}>Barbershop</Text>
              </TouchableOpacity>
 
              <TouchableOpacity
                style={[
                  styles.choiceButton,
                  shopType === "Salon" && styles.choiceSelected
                ]}
                onPress={() => setShopType("Salon")}
              >
                <Text style={styles.choiceText}>Salon</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
 
        <Text style={styles.hint}>
          Password needs at least 6 characters and one capital letter.
        </Text>
 
        {button(
          loading
            ? "PLEASE WAIT..."
            : isCustomerRegistration
            ? "CREATE CUSTOMER ACCOUNT"
            : "CREATE OWNER AND SHOP",
          isCustomerRegistration
            ? handleCustomerRegister
            : handleOwnerRegister,
          false,
          loading
        )}
 
        {button(
          "BACK TO SIGN IN",
          () => goTo("login"),
          true
        )}
      </>
    );
  }
 
  // FALLBACK SCREEN
  return page(
    <>
      <Text style={styles.logo}>QueLess</Text>
 
      <Text style={styles.description}>
        Please return to the sign-in screen.
      </Text>
 
      {button(
        "BACK TO SIGN IN",
        () => setScreen("login"),
        true
      )}
    </>
  );
}
 
// APP STYLES
const styles = StyleSheet.create({
 
  shopDetailsCard: {
  backgroundColor: "#252525",
  borderRadius: 14,
  padding: 18,
  marginBottom: 16,
  borderWidth: 1,
  borderColor: "#444444"
},
 
shopDetailText: {
  color: "#CCCCCC",
  fontSize: 14,
  lineHeight: 23,
  marginTop: 8
},
 
hoursRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingVertical: 12,
  borderBottomWidth: 1,
  borderBottomColor: "#444444"
},
 
hoursDay: {
  color: "#FFFFFF",
  fontSize: 13,
  fontWeight: "600"
},
 
hoursValue: {
  color: "#D9AE55",
  fontSize: 12,
  fontWeight: "600",
  textAlign: "right",
  flexShrink: 1,
  marginLeft: 10
},
 
  shopSearchInput: {
  backgroundColor: "#252525",
  borderWidth: 1,
  borderColor: "#444444",
  borderRadius: 10,
  padding: 14,
  color: "#FFFFFF",
  marginTop: 15,
  marginBottom: 12,
  fontSize: 14
},
 
shopFilterRow: {
  flexDirection: "row",
  gap: 10,
  marginBottom: 18
},
 
shopFilterButton: {
  flex: 1,
  padding: 11,
  borderRadius: 9,
  borderWidth: 1,
  borderColor: "#D9AE55",
  alignItems: "center"
},
 
shopFilterActive: {
  backgroundColor: "#D9AE55"
},
 
shopFilterText: {
  color: "#D9AE55",
  fontWeight: "bold",
  fontSize: 12
},
 
shopFilterTextActive: {
  color: "#171717"
},
 
  modernShopCard: {
    backgroundColor: "#252525",
    borderRadius: 16,
    padding: 17,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#444444"
  },
 
  shopIconBox: {
    width: 55,
    height: 55,
    borderRadius: 12,
    backgroundColor: "#40331E",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14
  },
 
  shopIcon: {
    fontSize: 28
  },
 
  shopInfo: {
    marginBottom: 12
  },
 
  modernShopName: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 5
  },
 
  modernShopType: {
    color: "#D9AE55",
    fontWeight: "bold",
    marginBottom: 10
  },
 
  modernShopDetail: {
    color: "#BBBBBB",
    fontSize: 13,
    marginBottom: 7
  },
 
  shopActions: {
    flexDirection: "row",
    gap: 10
  },
 
  outlineAction: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D9AE55",
    borderRadius: 9,
    padding: 12,
    alignItems: "center"
  },
 
  outlineActionText: {
    color: "#D9AE55",
    fontWeight: "bold",
    fontSize: 12
  },
 
  goldAction: {
    flex: 1.5,
    backgroundColor: "#D9AE55",
    borderRadius: 9,
    padding: 12,
    alignItems: "center"
  },
 
  goldActionText: {
    color: "#171717",
    fontWeight: "bold",
    fontSize: 12
  },
 
  shopProfileCard: {
    backgroundColor: "#302719",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginTop: 15,
    marginBottom: 20
  },
 
  shopProfileIcon: {
    fontSize: 40,
    marginBottom: 10
  },
 
  shopProfileName: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center"
  },
 
  shopProfileType: {
    color: "#D9AE55",
    fontWeight: "bold",
    marginTop: 5,
    marginBottom: 12
  },
 
  shopProfileDetail: {
    color: "#CCCCCC",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 6
  },
 
  modernServiceCard: {
    backgroundColor: "#252525",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#444444",
    padding: 17,
    marginBottom: 15
  },
 
  serviceTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
 
  serviceIconBox: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: "#40331E",
    alignItems: "center",
    justifyContent: "center"
  },
 
  serviceIcon: {
    fontSize: 25
  },
 
  modernServiceName: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold"
  },
 
  serviceSubtitle: {
    color: "#999999",
    fontSize: 12,
    marginTop: 4
  },
 
  serviceInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#1C1C1C",
    padding: 14,
    borderRadius: 10,
    marginTop: 17
  },
 
  infoLabel: {
    color: "#999999",
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 6
  },
 
  servicePrice: {
    color: "#D9AE55",
    fontSize: 18,
    fontWeight: "bold"
  },
 
  serviceDuration: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600"
  },
 
  bookServiceButton: {
    backgroundColor: "#D9AE55",
    padding: 14,
    borderRadius: 9,
    alignItems: "center",
    marginTop: 15
  },
 
  bookServiceText: {
    color: "#171717",
    fontWeight: "bold",
    fontSize: 13
  },
 
  emptyCard: {
    backgroundColor: "#252525",
    borderRadius: 14,
    padding: 25,
    alignItems: "center",
    marginTop: 15,
    marginBottom: 15
  },
 
  emptyIcon: {
    fontSize: 35,
    marginBottom: 12
  },
 
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8
  },
 
  emptyDescription: {
    color: "#AAAAAA",
    textAlign: "center",
    lineHeight: 20
  },
 
homeShopCard: {
  backgroundColor: "#252525",
  borderWidth: 1,
  borderColor: "#555555",
  borderRadius: 14,
  padding: 16,
  marginBottom: 12,
  flexDirection: "row",
  alignItems: "center",
  gap: 10
},
 
homeShopButton: {
  backgroundColor: "#D9AE55",
  paddingVertical: 11,
  paddingHorizontal: 12,
  borderRadius: 9
},
 
homeShopButtonText: {
  color: "#171717",
  fontSize: 12,
  fontWeight: "bold"
},
 
  container: {
    flex: 1,
    backgroundColor: "#171717"
  },
 
  homeHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 20
},
 
logoSmall: {
  color: "#D9AE55",
  fontSize: 28,
  fontWeight: "bold",
  letterSpacing: 2,
  marginBottom: 8
},
 
profileButton: {
  backgroundColor: "#303030",
  width: 48,
  height: 48,
  borderRadius: 24,
  justifyContent: "center",
  alignItems: "center"
},
 
profileButtonText: {
  fontSize: 23
},
 
heroCard: {
  backgroundColor: "#302719",
  padding: 22,
  borderRadius: 15,
  marginBottom: 25
},
 
heroTitle: {
  color: "#D9AE55",
  fontSize: 27,
  fontWeight: "bold",
  marginBottom: 10
},
 
heroDescription: {
  color: "#FFFFFF",
  fontSize: 14,
  lineHeight: 22
},
 
sectionTitle: {
  color: "#FFFFFF",
  fontSize: 20,
  fontWeight: "bold",
  marginTop: 18,
  marginBottom: 12
},
 
haircutGrid: {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 12
},
 
haircutCard: {
  backgroundColor: "#252525",
  borderWidth: 1,
  borderColor: "#444444",
  borderRadius: 12,
  width: "47%",
  padding: 18,
  alignItems: "center"
},
 
haircutIcon: {
  fontSize: 30,
  marginBottom: 10
},
 
haircutName: {
  color: "#D9AE55",
  fontWeight: "bold",
  fontSize: 15
},
 
sectionHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center"
},
 
viewAll: {
  color: "#D9AE55",
  fontWeight: "bold"
},
 
  content: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 50,
    paddingBottom: 40
  },
 
  logo: {
    color: "#D9AE55",
    fontSize: 36,
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: 2
  },
 
  tagline: {
    color: "#AAAAAA",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 36
  },
 
  heading: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "bold",
    marginTop: 25,
    marginBottom: 10
  },
 
  description: {
    color: "#AAAAAA",
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 20
  },
 
  label: {
    color: "#D9AE55",
    fontWeight: "600",
    marginTop: 15,
    marginBottom: 8
  },
 
  input: {
    backgroundColor: "#252525",
    borderColor: "#444444",
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    color: "#FFFFFF",
    fontSize: 15
  },
 
  placeholderText: {
    color: "#999999",
    fontSize: 15
  },
 
  hint: {
    color: "#AAAAAA",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10
  },
 
  button: {
    backgroundColor: "#D9AE55",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 18
  },
 
  buttonText: {
    color: "#171717",
    fontWeight: "bold",
    letterSpacing: 1,
    textAlign: "center"
  },
 
  secondaryButton: {
    borderColor: "#D9AE55",
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
    marginTop: 12
  },
 
  secondaryText: {
    color: "#D9AE55",
    fontWeight: "bold",
    textAlign: "center"
  },
 
  card: {
    backgroundColor: "#252525",
    padding: 20,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 16
  },
 
  welcome: {
    color: "#D9AE55",
    fontSize: 21,
    fontWeight: "bold",
    marginBottom: 15
  },
 
  detail: {
    color: "#FFFFFF",
    marginBottom: 10,
    lineHeight: 20
  },
 
  shopCard: {
    backgroundColor: "#252525",
    padding: 18,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#444444"
  },
 
  shopName: {
    color: "#D9AE55",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8
  },
 
  shopType: {
    color: "#AAAAAA",
    fontSize: 14,
    marginBottom: 12
  },
 
  loader: {
    marginTop: 30
  },
 
  choiceRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8
  },
 
  choiceRowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8
  },
 
  choiceButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#555555",
    alignItems: "center"
  },
 
  slotButton: {
    flexGrow: 0,
    flexBasis: "30%"
  },
  availableSlot: {
  backgroundColor: "#164D32",
  borderColor: "#22C55E"
},
 
occupiedSlot: {
  backgroundColor: "#5A2020",
  borderColor: "#EF4444",
  opacity: 0.8
},
 
slotLegend: {
  flexDirection: "row",
  gap: 20,
  marginTop: 8,
  marginBottom: 12
},
 
legendItem: {
  flexDirection: "row",
  alignItems: "center",
  gap: 6
},
 
availableDot: {
  width: 10,
  height: 10,
  borderRadius: 5,
  backgroundColor: "#22C55E"
},
 
occupiedDot: {
  width: 10,
  height: 10,
  borderRadius: 5,
  backgroundColor: "#EF4444"
},
 
slotStatusText: {
  color: "#FFFFFF",
  fontSize: 10,
  marginTop: 4
},
 
  choiceSelected: {
    backgroundColor: "#6B5428",
    borderColor: "#D9AE55"
  },
 
  choiceText: {
    color: "#FFFFFF",
    fontWeight: "600",
    textAlign: "center"
  },
 
  shopPictureCard: {
    backgroundColor: "#252525",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#444444",
    padding: 12,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
 
  shopPictureDetails: {
    flex: 1
  },
 
  shopPictureName: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "bold",
    marginBottom: 5
  },
 
  shopImageRight: {
    width: 112,
    height: 142,
    borderRadius: 11,
    backgroundColor: "#40331E"
  },
 
  demoLabel: {
    color: "#D9AE55",
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 8
  },
 
  mainShopImage: {
    width: "100%",
    height: 210,
    borderRadius: 15,
    marginTop: 14,
    backgroundColor: "#252525"
  },
 
  galleryDescription: {
    color: "#AAAAAA",
    fontSize: 13,
    marginBottom: 12
  },
 
  carouselContainer: {
    marginBottom: 18
  },
 
  carouselCard: {
    width: 155,
    backgroundColor: "#252525",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#444444",
    padding: 9,
    marginRight: 12
  },
 
  carouselImage: {
    width: "100%",
    height: 125,
    borderRadius: 9,
    backgroundColor: "#40331E"
  },
 
  carouselText: {
    color: "#D9AE55",
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 9,
    marginBottom: 4
  },
 
  // Refreshed customer dashboard styles
  customerHomeV3: {
    gap: 14
  },
  customerTopBarV3: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },
  customerBrandV3: {
    color: "#D9AE55",
    fontSize: 27,
    fontWeight: "800",
    letterSpacing: 2
  },
  customerWelcomeV3: {
    color: "#BBBBBB",
    fontSize: 13,
    marginTop: 4
  },
  customerProfileButtonV3: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#303030",
    justifyContent: "center",
    alignItems: "center"
  },
  customerProfileIconV3: {
    fontSize: 22
  },
 customerHeroV3: {
  backgroundColor: "#302719",
  borderWidth: 1,
  borderColor: "#594725",
  borderRadius: 16,
  minHeight: 260,
  justifyContent: "center",
  overflow: "hidden",
  marginBottom: 4,
  position: "relative"
},
  customerHeroImageV3: {
  ...StyleSheet.absoluteFillObject,
  zIndex: 0,
  elevation: 0
},
customerHeroOverlayV3: {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: "rgba(0, 0, 0, 0.62)",
  zIndex: 1,
  elevation: 1
},


  customerHeroEyebrowV3: {
    color: "#D9AE55",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1.5
  },
  customerHeroTitleV3: {
    color: "#FFFFFF",
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "800",
    marginTop: 12
  },
  customerHeroDescriptionV3: {
    color: "#DDDDDD",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8
  },
  customerHeroButtonV3: {
    backgroundColor: "#D9AE55",
    borderRadius: 8,
    padding: 13,
    alignItems: "center",
    marginTop: 18
  },
  customerHeroButtonTextV3: {
    color: "#171717",
    fontWeight: "bold",
    fontSize: 12
  },
  customerSectionHeaderV3: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8
  },
  customerSectionTitleV3: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold"
  },
  customerViewAllV3: {
    color: "#D9AE55",
    fontSize: 12,
    fontWeight: "bold"
  },
  customerGalleryGridV3: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10
  },
  customerGalleryTileV3: {
    width: "48%",
    backgroundColor: "#252525",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#3A3A3A",
    overflow: "hidden"
  },
  customerGalleryImageV3: {
    width: "100%",
    aspectRatio: 1.25,
    backgroundColor: "#333333"
  },
  customerGalleryLabelV3: {
    color: "#D9AE55",
    fontSize: 12,
    fontWeight: "bold",
    padding: 9
  },
  customerDescriptionV3: {
    color: "#AAAAAA",
    fontSize: 13,
    marginTop: -5
  },
  customerEmptyCardV3: {
    backgroundColor: "#252525",
    borderRadius: 12,
    padding: 20,
    alignItems: "center"
  },
  customerEmptyTitleV3: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 15
  },
  customerEmptyTextV3: {
    color: "#AAAAAA",
    fontSize: 12,
    textAlign: "center",
    marginTop: 5
  },
  customerShopCardV3: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#252525",
    borderWidth: 1,
    borderColor: "#3A3A3A",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10
  },
  customerShopImageV3: {
    width: 88,
    height: 96,
    borderRadius: 9,
    backgroundColor: "#333333"
  },
  customerShopInfoV3: {
    flex: 1
  },
  customerShopNameV3: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "bold"
  },
  customerShopTypeV3: {
    color: "#D9AE55",
    fontSize: 11,
    fontWeight: "bold",
    marginTop: 3
  },
  customerShopAddressV3: {
    color: "#AAAAAA",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5
  },
  customerShopLinkV3: {
    color: "#D9AE55",
    fontSize: 10,
    fontWeight: "bold",
    marginTop: 7
  },
  customerAccountSectionV3: {
    marginTop: 8
  },
 
  // Refreshed owner dashboard styles
  ownerDashboardV3: {
    gap: 12
  },
  ownerBrandV3: {
    color: "#D9AE55",
    textAlign: "center",
    fontSize: 34,
    fontWeight: "800",
    marginBottom: 2
  },
  ownerBrandLightV3: {
    color: "#FFFFFF"
  },
  ownerDashboardTitleV3: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4
  },
  ownerProfileCardV3: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    backgroundColor: "#252525",
    borderRadius: 12,
    padding: 14
  },
  ownerAvatarV3: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#40331E",
    alignItems: "center",
    justifyContent: "center"
  },
  ownerAvatarTextV3: {
    fontSize: 28
  },
  ownerProfileDetailsV3: {
    flex: 1
  },
  ownerShopNameV3: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold"
  },
  ownerMutedV3: {
    color: "#999999",
    fontSize: 12,
    marginTop: 3
  },
  ownerContactCardV3: {
    backgroundColor: "#252525",
    borderRadius: 12,
    padding: 14
  },
  ownerContactTextV3: {
    color: "#DDDDDD",
    fontSize: 12,
    lineHeight: 20
  },
  ownerMapLinkV3: {
    alignSelf: "flex-start",
    marginTop: 9
  },
  ownerMapLinkTextV3: {
    color: "#D9AE55",
    fontWeight: "bold",
    fontSize: 11
  },
  ownerSectionTitleV3: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "bold",
    marginTop: 5
  },
  ownerGridV3: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10
  },
  ownerTileV3: {
    width: "48%",
    minHeight: 104,
    justifyContent: "space-between",
    backgroundColor: "#252525",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#66532D"
  },
  ownerTileIconV3: {
    color: "#D9AE55",
    fontSize: 23,
    fontWeight: "bold"
  },
  ownerTileLabelV3: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "bold",
    marginTop: 12
  },
 
  nearestSortButton: {
    backgroundColor: "#302719",
    borderWidth: 1,
    borderColor: "#D9AE55",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 16
  },
 
  nearestSortButtonText: {
    color: "#D9AE55",
    fontWeight: "bold",
    textAlign: "center"
  },
 
  shopDistanceText: {
    color: "#22C55E",
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 3,
    marginBottom: 7
  },
 
});
