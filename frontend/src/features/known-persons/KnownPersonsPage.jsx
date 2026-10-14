import { useEffect, useMemo, useState } from "react";
import { Upload } from "lucide-react";
import "./KnownPersonsPage.css";
import { useToast } from "../../context/ToastContext";
import {
  createKnownPerson,
  deleteKnownPerson,
  listKnownPersons,
  updateKnownPerson,
} from "../../api/knownPersonsApi";

function KnownPersonsPage() {
  const { toast, confirm } = useToast();
  const [knownPersons, setKnownPersons] = useState([]);

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
        toast.error(data?.error || "Could not load known persons");
        return;
      }

      setKnownPersons(data);
    } catch {
      toast.error("Could not connect to backend server");
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
    setFileInputKey((prev) => prev + 1);
  };

  const handleDelete = async (person) => {
    const shouldDelete = await confirm({
      title: "Delete Known Person",
      message: `Are you sure you want to delete "${person.name}" from known persons? This action cannot be undone.`,
      confirmText: "Delete Person",
      cancelText: "Cancel",
      confirmVariant: "danger",
    });

    if (!shouldDelete) return;

    try {
      const { response, data } = await deleteKnownPerson(person.id);

      if (!response.ok) {
        const errorMsg = data?.error || "Could not delete known person";
        toast.error(errorMsg);
        return;
      }

      toast.success(`"${person.name}" deleted successfully`);

      if (selectedPerson?.id === person.id) {
        resetForm();
      }

      fetchPersons();
    } catch {
      toast.error("Could not connect to backend server");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.warning("Name is required");
      return;
    }

    if (!selectedPerson && !form.image) {
      toast.warning("Image is required");
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
        const errorMsg =
          data?.error ||
          (selectedPerson
            ? "Could not update known person"
            : "Could not create known person");
        toast.error(errorMsg);
        return;
      }

      const successMsg = selectedPerson
        ? `"${form.name.trim()}" updated successfully`
        : `"${form.name.trim()}" added to known persons`;
      toast.success(successMsg);

      resetForm();
      fetchPersons();
    } catch {
      toast.error("Could not connect to backend server");
    }
  };

  return (
    <div className="known-persons-layout">
      <div className="known-person-card">
        <h2>{selectedPerson ? "Edit Known Person" : "Add Known Person"}</h2>

        <form onSubmit={handleSubmit}>
          <div className="known-person-field">
            <label className="known-person-label">
              Name <span className="required-asterisk">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. John Doe"
            />
          </div>

          <div className="known-person-field">
            <label className="known-person-label">
              Category <span className="optional-tag">(optional)</span>
            </label>
            <input
              type="text"
              name="category"
              value={form.category}
              onChange={handleChange}
              placeholder="Family, Friend, Staff..."
            />
          </div>

          <div className="known-person-field">
            <label className="known-person-label">
              {selectedPerson ? (
                <>Replace Image <span className="optional-tag">(optional)</span></>
              ) : (
                <>Image <span className="required-asterisk">*</span></>
              )}
            </label>

            <div className="custom-file-upload-wrapper">
              <input
                key={fileInputKey}
                id="kp-image-file-input"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden-file-input"
              />
              <label htmlFor="kp-image-file-input" className="custom-file-upload-btn">
                <Upload size={16} className="upload-icon" />
                <span className="file-upload-text">
                  {form.image ? form.image.name : selectedPerson ? "Choose replacement image file" : "Choose image file"}
                </span>
              </label>
            </div>
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