
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";

import {
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import { auth } from "./firebase";
import QueueManagement from "./QueueManagement";

export default function AdminPanel({ onBack }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert("Required", "Enter your staff email and password.");
      return;
    }

    setLoading(true);

    try {
      await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      setLoggedIn(true);
    } catch (error) {
      console.error("Staff login error:", error);

      Alert.alert(
        "Login Failed",
        "Check your email and password, and make sure Email/Password sign-in is enabled."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await signOut(auth);
      setLoggedIn(false);
      setPassword("");
    } catch (error) {
      Alert.alert("Error", "Unable to log out. Please try again.");
    }
  }

  if (loggedIn) {
    return (
      <View style={styles.queueScreen}>
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>STAFF ADMIN</Text>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.queueContent}>
          <QueueManagement />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>BARBERQUEUE</Text>
      <Text style={styles.heading}>Staff Login</Text>

      <Text style={styles.description}>
        Sign in with your authorized staff account to manage appointments.
      </Text>

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        placeholder="Staff email"
        placeholderTextColor="#999999"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text style={styles.label}>Password</Text>
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#999999"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
      />

      <TouchableOpacity
        style={styles.loginButton}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#171717" />
        ) : (
          <Text style={styles.loginButtonText}>LOG IN</Text>
        )}
      </TouchableOpacity>

      {onBack && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
        >
          <Text style={styles.backText}>Back to Booking</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "#171717",
    padding: 24,
  },
  logo: {
    color: "#D9AE55",
    fontWeight: "bold",
    fontSize: 17,
    letterSpacing: 3,
    textAlign: "center",
  },
  heading: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 18,
  },
  description: {
    color: "#AAAAAA",
    textAlign: "center",
    marginTop: 12,
    marginBottom: 24,
    lineHeight: 21,
  },
  label: {
    color: "#D9AE55",
    fontWeight: "bold",
    marginBottom: 8,
    marginTop: 14,
  },
  input: {
    backgroundColor: "#252525",
    borderWidth: 1,
    borderColor: "#444444",
    borderRadius: 10,
    padding: 14,
    color: "#FFFFFF",
  },
  loginButton: {
    backgroundColor: "#D9AE55",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    marginTop: 25,
  },
  loginButtonText: {
    color: "#171717",
    fontWeight: "bold",
  },
  backButton: {
    alignItems: "center",
    padding: 16,
  },
  backText: {
    color: "#DDDDDD",
  },
  queueScreen: {
    flex: 1,
    backgroundColor: "#171717",
  },
  topBar: {
    backgroundColor: "#252525",
    paddingTop: 45,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  topBarTitle: {
    color: "#D9AE55",
    fontWeight: "bold",
  },
  logoutButton: {
    backgroundColor: "#444444",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 7,
  },
  logoutText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  queueContent: {
    flex: 1,
  },
});
