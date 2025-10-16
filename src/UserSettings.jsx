import { useState, useEffect } from "react";
import "./styles/UserSettings.css";

function UserSettings() {
  const storedId = sessionStorage.getItem("id"); // user id from login

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    signature_url: "", // Base64 image
  });

  useEffect(() => {
    const storedName = sessionStorage.getItem("name") || "";
    const storedEmail = sessionStorage.getItem("email") || "";
    const storedSignature = sessionStorage.getItem("signature_url") || "";

    setFormData((prev) => ({
      ...prev,
      name: storedName,
      email: storedEmail,
      signature_url: storedSignature,
    }));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({ ...prev, signature_url: reader.result }));
    };
    reader.readAsDataURL(file); // convert image to Base64
  };

  const handleSave = async () => {
    if (formData.password && formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    try {
      const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/users/${storedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        // update sessionStorage
        sessionStorage.setItem("name", data.name);
        sessionStorage.setItem("email", data.email);
        if (data.signature_url) sessionStorage.setItem("signature_url", data.signature_url);
        alert("Profile updated successfully!");
      } else {
        alert(data.message || "Failed to update profile.");
      }
    } catch (err) {
      console.error(err);
      alert("Server error. Please try again.");
    }
  };

  return (
    <div className="user-settings">
      <h2>User Profile & Settings</h2>

      <div className="settings-form">
        <label>
          Full Name
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
          />
        </label>

        <label>
          Email
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
          />
        </label>

        <label>
          Signature
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
          />
        </label>

        {formData.signature_url && (
          <img
            src={formData.signature_url}
            alt="Signature Preview"
            style={{ marginTop: "0.5rem", maxWidth: "300px", border: "1px solid #ccc" }}
          />
        )}

        <label>
          New Password
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
          />
        </label>

        <label>
          Confirm Password
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
          />
        </label>

        <button type="button" className="btn-save" onClick={handleSave}>
          Save Changes
        </button>
      </div>
    </div>
  );
}

export default UserSettings;
