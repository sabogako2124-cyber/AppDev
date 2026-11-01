
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";

import { db } from "./firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
} from "firebase/firestore";

const STATUSES = [
  "pending",
  "waiting",
  "serving",
  "completed",
  "cancelled",
];

export default function QueueManagement() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");

  useEffect(() => {
    const appointmentsQuery = query(
      collection(db, "appointments"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(
      appointmentsQuery,
      (snapshot) => {
        const bookings = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setAppointments(bookings);
        setError("");
        setLoading(false);
      },
      (err) => {
        console.error("Queue loading error:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  async function changeStatus(bookingId, status) {
    try {
      await updateDoc(doc(db, "appointments", bookingId), {
        status,
      });

      Alert.alert("Updated", `Booking status changed to ${status}.`);
    } catch (err) {
      console.error("Status update error:", err);
      Alert.alert(
        "Update Failed",
        "Hindi ma-update ang booking. Tingnan ang Firebase Rules."
      );
    }
  }

  const visibleAppointments =
    filter === "all"
      ? appointments
      : appointments.filter(
          (item) => item.status === filter
        );

  const waitingCount = appointments.filter(
    (item) =>
      item.status === "pending" ||
      item.status === "waiting"
  ).length;

  const servingCount = appointments.filter(
    (item) => item.status === "serving"
  ).length;

  function renderBooking({ item, index }) {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.queueNumber}>
            <Text style={styles.queueNumberText}>
              #{index + 1}
            </Text>
          </View>

          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>
              {item.customerName || "Customer"}
            </Text>
            <Text style={styles.service}>
              {item.service || "Service not specified"}
            </Text>
          </View>
        </View>

        <Text style={styles.detail}>
          Date: {item.appointmentDate || "N/A"}
        </Text>

        <Text style={styles.detail}>
          Time: {item.appointmentTime || "N/A"}
        </Text>

        <Text style={styles.detail}>
          Price: ₱{item.price ?? 0}
        </Text>

        <Text style={styles.statusLabel}>
          Status: {(item.status || "pending").toUpperCase()}
        </Text>

        <View style={styles.actions}>
          {STATUSES.filter(
            (status) => status !== item.status
          ).map((status) => (
            <TouchableOpacity
              key={status}
              style={styles.actionButton}
              onPress={() => changeStatus(item.id, status)}
            >
              <Text style={styles.actionText}>
                {status === "serving"
                  ? "Now Serving"
                  : status.charAt(0).toUpperCase() +
                    status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#D9AE55" />
        <Text style={styles.muted}>Loading queue...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.heading}>Queue unavailable</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.muted}>
          Check staff access and Firestore Rules.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>BARBERQUEUE</Text>
      <Text style={styles.heading}>Queue Management</Text>

      <View style={styles.stats}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {appointments.length}
          </Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{waitingCount}</Text>
          <Text style={styles.statLabel}>Waiting</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{servingCount}</Text>
          <Text style={styles.statLabel}>Serving</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Filter Queue</Text>

      <View style={styles.filters}>
        {[
          "all",
          "pending",
          "waiting",
          "serving",
          "completed",
          "cancelled",
        ].map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterButton,
              filter === status && styles.activeFilter,
            ]}
            onPress={() => setFilter(status)}
          >
            <Text
              style={[
                styles.filterText,
                filter === status && styles.activeFilterText,
              ]}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {visibleAppointments.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No appointments yet</Text>
          <Text style={styles.muted}>
            New bookings will appear here when access is configured.
          </Text>
        </View>
      ) : (
        <FlatList
          data={visibleAppointments}
          keyExtractor={(item) => item.id}
          renderItem={renderBooking}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#171717",
    paddingTop: 45,
    paddingHorizontal: 16,
  },
  center: {
    flex: 1,
    backgroundColor: "#171717",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  logo: {
    color: "#D9AE55",
    fontWeight: "bold",
    letterSpacing: 3,
    fontSize: 16,
    textAlign: "center",
  },
  heading: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 12,
    marginBottom: 18,
  },
  stats: {
    flexDirection: "row",
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#292929",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
  },
  statNumber: {
    color: "#D9AE55",
    fontWeight: "bold",
    fontSize: 23,
  },
  statLabel: {
    color: "#CCCCCC",
    marginTop: 4,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
    marginTop: 22,
    marginBottom: 10,
  },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginBottom: 12,
  },
  filterButton: {
    backgroundColor: "#292929",
    borderRadius: 7,
    paddingVertical: 9,
    paddingHorizontal: 11,
  },
  activeFilter: {
    backgroundColor: "#D9AE55",
  },
  filterText: {
    color: "#EEEEEE",
    fontSize: 12,
  },
  activeFilterText: {
    color: "#171717",
    fontWeight: "bold",
  },
  list: {
    paddingBottom: 35,
  },
  card: {
    backgroundColor: "#252525",
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#444444",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  queueNumber: {
    backgroundColor: "#D9AE55",
    borderRadius: 8,
    padding: 11,
    marginRight: 12,
  },
  queueNumberText: {
    color: "#171717",
    fontWeight: "bold",
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  service: {
    color: "#D9AE55",
    marginTop: 4,
  },
  detail: {
    color: "#DDDDDD",
    marginTop: 6,
  },
  statusLabel: {
    color: "#D9AE55",
    fontWeight: "bold",
    marginTop: 12,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 12,
  },
  actionButton: {
    backgroundColor: "#393939",
    borderWidth: 1,
    borderColor: "#D9AE55",
    borderRadius: 7,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  actionText: {
    color: "#FFFFFF",
    fontSize: 12,
  },
  empty: {
    alignItems: "center",
    padding: 25,
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "bold",
    marginBottom: 8,
  },
  muted: {
    color: "#AAAAAA",
    marginTop: 10,
    textAlign: "center",
  },
  errorText: {
    color: "#FF9999",
    textAlign: "center",
    marginTop: 12,
  },
});
