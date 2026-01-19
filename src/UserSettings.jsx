import { useState, useEffect } from "react";
import "./styles/UserSettings.css";
import { User, Mail, Phone, Briefcase, Edit3, Save, X, KeyRound, Image, } from "lucide-react";
import { API_BASE_URL } from "./config/api.js";

function UserSettings() {
  const storedId = sessionStorage.getItem("id");

  const [formData, setFormData] = useState({
    id: "",
    employee_id: "",
    name: "",
    email: "",
    contact_no: "",
    role: "",
    signature: "",
    profile_img: "",
    created_at: "",
    updated_at: "",
  });

  const [password, setPassword] = useState("");
  const [showImageModal, setShowImageModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false); 
  const [isClosing, setIsClosing] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!storedId) return;

    fetch(`${API_BASE_URL}/users/${storedId}`)
      .then((res) => res.json())
      .then((data) => setFormData(data))
      .catch((err) => console.error("Error fetching user:", err));
  }, [storedId]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if ((name === "signature" || name === "profile_img") && files[0]) {
      setFormData({ ...formData, [name]: files[0] });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleCloseModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      setShowEditModal(false);
      setShowImageModal(false);
      setIsClosing(false);
    }, 300);
  };

  const handleSave = async () => {
    try {
      const formDataToSend = new FormData();
      formDataToSend.append("employee_id", formData.employee_id || "");
      formDataToSend.append("name", formData.name || "");
      formDataToSend.append("email", formData.email || "");
      formDataToSend.append("contact_no", formData.contact_no || "");
      formDataToSend.append("role", formData.role || "");

      if (password.trim() !== "") {
        formDataToSend.append("password", password);
      }

      if (formData.signature instanceof File) {
        formDataToSend.append("signature", formData.signature);
      }

      if (formData.profile_img instanceof File) {
        formDataToSend.append("profile_img", formData.profile_img);
      }

      const response = await fetch(`${API_BASE_URL}/users/update/${storedId}`, {
        method: "PUT",
        body: formDataToSend,
      });

      const result = await response.json();

      if (response.ok || result.success) {
        setMessage({ type: "success", text: result.message || "User updated successfully!" });
        setPassword("");
        setIsClosing(true);
        setTimeout(() => {
          setShowEditModal(false);
          setIsClosing(false);
        }, 300);
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        setMessage({ type: "error", text: result.message || "Failed to update user." });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: "error", text: "Error updating user." });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div className="family">
      <div className="user-profile-wrapper">
        <div className="user-header">
          <div className="user-info"  >
            <img
              src={
                formData.profile_img
                  ? `${API_BASE_URL}/uploads/profile/${formData.profile_img}`
                  : "/default.png"
              }
              style={{ cursor: "pointer" }} onClick={() => setShowImageModal(true)}
              alt="Profile"
              className="user-avatar"
            />
            <div>
              <h3>{formData.name || "User Name"}</h3>
              <p>{formData.email}</p>
            </div>
          </div>

          <button onClick={() => setShowEditModal(true)} className="edit-btn top-right">
            <Edit3 size={16} /> Edit
          </button>
        </div>

        {message && (
          <div className={`message-modal-overlay`}>
            <div className={`message-modal-content ${message.type}`}>
              {message.text}
            </div>
          </div>
        )}

        <div className="user-form-grid">
          <div className="form-group form-group-items">
            <label><User size={16}/> Full Name:</label>
            <input value={formData.name || ""} readOnly />
          </div>
          <div className="form-group form-group-items">
            <label><Mail size={16}/> Email:</label>
            <input value={formData.email || ""} readOnly />
          </div>
          <div className="form-group form-group-items">
            <label><Phone size={16}/> Contact No.:</label>
            <input value={formData.contact_no || ""} readOnly />
          </div>
          <div className="form-group form-group-items">
            <label><Briefcase size={16}/> Role:</label>
            <input value={(formData.role || "").toUpperCase()} readOnly />
          </div>
          <div className="form-group form-group-items">
            <label><Image size={16}/> Signature</label>
            {formData.signature && typeof formData.signature === "string" && (
              <img
                src={`${API_BASE_URL}/uploads/signatures/${formData.signature}`}
                alt="Signature"
                className="signature-preview"
              />
            )}
          </div>
          <div className="form-group form-group-items">
            <label>Created At</label>
            <input
              value={
                formData.created_at
                  ? new Date(formData.created_at).toLocaleString("en-PH", {
                      timeZone: "Asia/Manila",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })
                  : ""
              }
              readOnly
            />
          </div>
        </div>
      </div>

      {showImageModal && (
        <div
          className={`img-modal-overlay ${isClosing ? "fade-out" : ""}`}
          onClick={() => setShowImageModal(false)}
        >
          <div
            className="img-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={
                formData.profile_img instanceof File
                  ? URL.createObjectURL(formData.profile_img)
                  : formData.profile_img
                    ? `${API_BASE_URL}/uploads/profile/${formData.profile_img}`
                    : "/default.png"
              }
              alt="Profile Large"
              style={{ maxWidth: "100%", maxHeight: "400px", borderRadius: "8px" }}
            />

            <input
              type="file"
              accept="image/*"
              name="profile_img"
              style={{ marginTop: "15px" }}
              onChange={(e) => {
                const file = e.target.files[0];
                if (!file) return;
                if (!file.type.startsWith("image/")) {
                  alert("Please select a valid image (PNG, JPG, etc.)");
                  e.target.value = "";
                  return;
                }
                setFormData({ ...formData, profile_img: file });
              }}
            />

            <div className="img-modal-buttons">
              <button onClick={handleCloseModal} className="cancel-btn">Close</button>
              <button
                onClick={async () => {
                  try {
                    const formDataToSend = new FormData();
                    if (formData.profile_img instanceof File) {
                      formDataToSend.append("profile_img", formData.profile_img);
                    }

                    const response = await fetch(`${API_BASE_URL}/users/update/${storedId}`, {
                      method: "PUT",
                      body: formDataToSend,
                    });
                    const result = await response.json();

                    if (response.ok || result.success) {
                      setMessage({ type: "success", text: "Profile image updated successfully!" });
                      setShowImageModal(false);

                      setTimeout(() => {
                        setMessage(null);
                        window.location.reload();
                      }, 3000);
                    } else {
                      setMessage({ type: "error", text: result.message || "Failed to update profile image." });
                      setTimeout(() => setMessage(null), 3000);
                    }
                  } catch (error) {
                    console.error(error);
                    setMessage({ type: "error", text: "Error updating profile image." });
                    setTimeout(() => setMessage(null), 3000);
                  }
                }}
                className="save-btn"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className={`modal-overlay ${isClosing ? "fade-out" : ""}`}>
          <div className="modal-content-profile">
            <h2>Edit User Information</h2>

            <div className="form-group">
              <label><User size={16}/> Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name || ""}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label><Mail size={16}/> Email</label>
              <input
                type="email"
                name="email"
                value={formData.email || ""}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label><Phone size={16}/> Contact No.</label>
              <input
                type="text"
                name="contact_no"
                value={formData.contact_no || ""}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label><Briefcase size={16}/> Role</label>
              <input
                type="text"
                name="role"
                value={formData.role || ""}
                onChange={handleChange}
                readOnly
              />
            </div>

            <div className="form-group">
              <label><KeyRound size={16}/> Password</label>
              <input
                type="password"
                name="password"
                value={password}
                placeholder="Enter new password (optional)"
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label><Image size={16}/> Signature</label>
              <input
                type="file"
                name="signature"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file && !file.type.startsWith("image/")) {
                    alert("Please upload a valid image file (PNG, JPG, etc.)");
                    e.target.value = "";
                    return;
                  }
                  handleChange(e);
                }}
              />
            </div>

            <div className="modal-buttons">
              <button onClick={handleSave} className="save-btn">
                <Save size={16}/> Save
              </button>
              <button onClick={handleCloseModal} className="cancel-btn">
                <X size={16}/> Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserSettings;
