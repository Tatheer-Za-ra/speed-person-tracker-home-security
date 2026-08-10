import { useEffect, useMemo, useState } from "react";
import "./KnownPersonsPage.css";
import {
  createKnownPerson,
  deleteKnownPerson,
  listKnownPersons,
  updateKnownPerson,
} from "../../api/knownPersonsApi";

function KnownPersonsPage() {
  const [knownPersons, setKnownPersons] = useState([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");

  const [form, setForm] = useState({
    name: "",
    category: "",
    image: null,
  });

  const [selectedPerson, setSelectedPerson] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);

  const previewText = useMemo(() => {
    if (previewUrl) return "Image selected";
    if (selectedPerson?.image_url) return "Using existing saved image";
    return "No image selected";
  }, [previewUrl, selectedPerson]);

  const resetForm = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setForm({
      name: "",
      category: "",
      image: null,
    });
    setSelectedPerson(null);
    setPreviewUrl("");
    setFileInputKey((prev) => prev + 1);
  };

  const fetchPersons = async () => {
    try {
      const { response, data } = await listKnownPersons();

      if (!response.ok) {
        setMessageType("error");
        setMessage(data.error || "Could not load known persons");
        return;
      }

      setKnownPersons(data);
    } catch {
      setMessageType("error");
      setMessage("Could not connect to backend");
    }
  };

  useEffect(() => {
    fetchPersons();
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0] || null;

    setForm((prev) => ({
      ...prev,
      image: file,
    }));

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl("");
    }
  };

  const handleEdit = (person) => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedPerson(person);
    setForm({
      name: person.name || "",
      category: person.category || "",
      image: null,
    });
    setPreviewUrl("");
    setMessage("");
    setFileInputKey((prev) => prev + 1);
  };

  const handleDelete = async (person) => {
    const shouldDelete = window.confirm(
      `Delete "${person.name}" from known persons?`
    );

    if (!shouldDelete) return;

    try {
      const { response, data } = await deleteKnownPerson(person.id);

      if (!response.ok) {
        setMessageType("error");
        setMessage(data.error || "Could not delete known person");
        return;
      }

      setMessageType("success");
      setMessage("Known person deleted successfully");

      if (selectedPerson?.id === person.id) {
        resetForm();
      }

      fetchPersons();
    } catch {
      setMessageType("error");
      setMessage("Could not connect to backend");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!form.name.trim()) {
      setMessageType("error");
      setMessage("Name is required");
      return;
    }

    if (!selectedPerson && !form.image) {
      setMessageType("error");
      setMessage("Image is required");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("name", form.name.trim());
      formData.append("category", form.category.trim());

      if (form.image) {
        formData.append("image", form.image);
      }

      let response;
      let data;

      if (selectedPerson) {
        ({ response, data } = await updateKnownPerson(selectedPerson.id, formData));
      } else {
        ({ response, data } = await createKnownPerson(formData));
      }

      if (!response.ok) {
        setMessageType("error");
        setMessage(
          data.error ||
            (selectedPerson
              ? "Could not update known person"
              : "Could not create known person")
        );
        return;
      }

      setMessageType("success");
      setMessage(
        selectedPerson
          ? "Known person updated successfully"
          : "Known person added successfully"
      );

      resetForm();
      fetchPersons();
    } catch {
      setMessageType("error");
      setMessage("Could not connect to backend");
    }
  };

  return (
    <div className="known-persons-layout">
      <div className="known-person-card">
        <h2>{selectedPerson ? "Edit Known Person" : "Add Known Person"}</h2>

        {message && <p className={`message ${messageType}`}>{message}</p>}

        <form onSubmit={handleSubmit}>
          <div className="known-person-field">
            <label>Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
            />
          </div>

          <div className="known-person-field">
            <label>Category</label>
            <input
              type="text"
              name="category"
              value={form.category}
              onChange={handleChange}
              placeholder="Family, Friend, Staff..."
            />
          </div>

          <div className="known-person-field">
            <label>
              {selectedPerson ? "Replace Image (optional)" : "Image"}
            </label>
            <input
              key={fileInputKey}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />
          </div>

          <div className="image-preview-box">
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="image-preview" />
            ) : selectedPerson?.image_url ? (
              <img
                src={selectedPerson.image_url}
                alt={selectedPerson.name}
                className="image-preview"
              />
            ) : (
              <p>{previewText}</p>
            )}
          </div>

          <div className="known-person-actions">
            <button type="submit" className="primary-button">
              {selectedPerson ? "Update Person" : "Add Person"}
            </button>

            {selectedPerson && (
              <button
                type="button"
                className="secondary-button"
                onClick={resetForm}
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="known-person-card">
        <h2>Known Persons List</h2>

        {knownPersons.length === 0 ? (
          <p>No known persons added yet.</p>
        ) : (
          <div className="known-person-list">
            {knownPersons.map((person) => (
              <div key={person.id} className="known-person-item">
                <div className="known-person-left">
                  <img
                    src={person.image_url}
                    alt={person.name}
                    className="known-person-thumb"
                  />
                  <div>
                    <strong>{person.name}</strong>
                    <p className="known-person-category">
                      {person.category || "No category"}
                    </p>
                  </div>
                </div>

                <div className="known-person-item-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => handleEdit(person)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => handleDelete(person)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default KnownPersonsPage;