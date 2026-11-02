import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { Building2, CircleCheck, ExternalLink, MapPin, MessageCircle, Phone, Save } from "lucide-react";

import { fetchInstituteSettings, saveInstituteSettings, type InstituteSettings } from "../../api/institute";
import { buildContact } from "../../data/contact";

type Props = { onSaved: (message: string) => void };

const fields: { key: keyof InstituteSettings; label: string; placeholder: string; help?: string; type?: string; wide?: boolean }[] = [
  { key: "instituteName", label: "Institute name", placeholder: "Learners Commercial Institute", wide: true },
  { key: "phone", label: "Phone number", placeholder: "+91 94461 25964", type: "tel", help: "Shown on the website and used for the Call buttons." },
  { key: "whatsapp", label: "WhatsApp number", placeholder: "Same as phone if left empty", type: "tel", help: "Used for every WhatsApp button." },
  { key: "email", label: "Email address", placeholder: "office@example.com", type: "email" },
  { key: "mapsUrl", label: "Google Maps link", placeholder: "https://maps.google.com/…", type: "url", help: "Used for Directions." },
  { key: "address", label: "Address", placeholder: "Thirunakkara, Kottayam, Kerala", wide: true },
];

function ProfileForm({ initial, onSaved }: { initial: InstituteSettings } & Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");

  const save = useMutation({
    mutationFn: saveInstituteSettings,
    onSuccess: async () => {
      onSaved("Institute profile saved. The website now shows these details.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["institute-settings"] }),
        queryClient.invalidateQueries({ queryKey: ["institute-public"] }),
      ]);
    },
    onError: (failure) => setError(failure.message),
  });

  const preview = buildContact({ ...form, whatsapp: form.whatsapp || null });
  const changed = (Object.keys(form) as (keyof InstituteSettings)[]).some((key) => form[key] !== initial[key]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (form.instituteName.trim().length < 2) {
      setError("Enter the institute name.");
      return;
    }

    save.mutate({ ...form, instituteName: form.instituteName.trim() });
  };

  return (
    <div className="settings-tools__split">
      <form className="settings-form records-panel settings-tools__card" onSubmit={submit}>
        <div className="settings-tools__card-head">
          <h2>Institute profile</h2>
          <p>Contact details shown on the public website. Changes appear on the site within a few minutes.</p>
        </div>

        <fieldset className="settings-tools__grid" disabled={save.isPending}>
          {fields.map((field) => (
            <label key={field.key} className={field.wide ? "settings-tools__field settings-tools__field--wide" : "settings-tools__field"}>
              <span>{field.label}</span>
              {field.key === "address" ? (
                <textarea
                  rows={2}
                  value={form[field.key]}
                  placeholder={field.placeholder}
                  maxLength={1000}
                  onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}
                />
              ) : (
                <input
                  type={field.type ?? "text"}
                  value={form[field.key]}
                  placeholder={field.placeholder}
                  onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}
                />
              )}
              {field.help && <small>{field.help}</small>}
            </label>
          ))}
        </fieldset>

        {error && (
          <p className="settings-tools__error" role="alert">
            {error}
          </p>
        )}

        <div className="settings-tools__actions">
          <button className="records-button records-button--primary" type="submit" disabled={save.isPending || !changed}>
            <Save size={16} aria-hidden="true" />
            {save.isPending ? "Saving…" : "Save profile"}
          </button>
          {!changed && !save.isPending && <span className="settings-tools__hint">No unsaved changes</span>}
        </div>
      </form>

      <aside className="records-panel settings-tools__card settings-tools__preview" aria-label="Website preview">
        <span className="records-eyebrow">On the website</span>
        <h3>
          <Building2 size={18} aria-hidden="true" />
          {form.instituteName || "Institute name"}
        </h3>
        <ul>
          <li>
            <Phone size={16} aria-hidden="true" />
            <a href={preview.phoneHref}>{preview.phoneDisplay}</a>
          </li>
          <li>
            <MessageCircle size={16} aria-hidden="true" />
            <a href={preview.whatsappHref} target="_blank" rel="noopener noreferrer">
              WhatsApp chat
              <ExternalLink size={12} aria-hidden="true" />
            </a>
          </li>
          <li>
            <MapPin size={16} aria-hidden="true" />
            <span>
              {preview.address}
              <a href={preview.mapsUrl} target="_blank" rel="noopener noreferrer">
                Directions
                <ExternalLink size={12} aria-hidden="true" />
              </a>
            </span>
          </li>
        </ul>
        <p className="settings-tools__hint">
          <CircleCheck size={14} aria-hidden="true" />
          Empty or unrecognised numbers fall back to the website’s built-in details.
        </p>
      </aside>
    </div>
  );
}

export function InstituteProfilePanel({ onSaved }: Props) {
  const query = useQuery({ queryKey: ["institute-settings"], queryFn: fetchInstituteSettings });

  if (query.isPending) {
    return <div className="records-panel settings-tools__card settings-tools__loading">Loading institute profile…</div>;
  }

  if (query.isError) {
    return (
      <div className="records-notice records-notice--error" role="alert">
        <span>{query.error.message}</span>
      </div>
    );
  }

  // Keyed so a refetch after saving resets the form to the saved values.
  return <ProfileForm key={JSON.stringify(query.data)} initial={query.data} onSaved={onSaved} />;
}
