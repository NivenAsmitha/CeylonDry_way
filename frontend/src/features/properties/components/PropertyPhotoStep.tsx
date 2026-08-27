import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { ErrorMessage } from "../../../components/common/ErrorMessage";
import { normalizeApiError } from "../../../types/api.types";
import {
  useRemovePropertyPhoto,
  useReorderPropertyPhotos,
  useSetPropertyPhotoCover,
  useUpdatePropertyPhotoAltText,
  useUploadPropertyPhotos,
} from "../hooks/useOwnerProperties";
import type { PropertyPhoto } from "../types/property.types";

const PROPERTY_PHOTO_FIELD_NAME = "photos";
const MAX_PROPERTY_PHOTOS = 4;
const MAX_PROPERTY_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_PROPERTY_PHOTO_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

interface PreviewFile {
  file: File;
  url: string;
}

interface PropertyPhotoStepProps {
  propertyId: string;
  propertyName: string;
  photos: PropertyPhoto[];
  editable: boolean;
}

function safeErrorMessages(error: unknown): string[] {
  return normalizeApiError(error).messages;
}

function PhotoCard({
  photo,
  index,
  total,
  propertyName,
  disabled,
  onCover,
  onMove,
  onRemove,
  onAltText,
}: {
  photo: PropertyPhoto;
  index: number;
  total: number;
  propertyName: string;
  disabled: boolean;
  onCover: () => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  onAltText: (altText: string | null) => void;
}) {
  const [altText, setAltText] = useState(photo.altText ?? "");

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="relative aspect-[4/3] bg-slate-100">
        <img
          className="size-full object-cover"
          src={photo.url}
          alt={photo.altText || `Photo of ${propertyName}`}
        />
        {photo.isCover ? (
          <span className="absolute left-3 top-3 rounded-full bg-emerald-700 px-3 py-1 text-xs font-black text-white">
            Cover photo
          </span>
        ) : null}
      </div>
      <div className="space-y-3 p-4">
        <label className="block text-sm font-bold">
          Alt text
          <input
            className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 font-normal"
            disabled={disabled}
            maxLength={200}
            value={altText}
            onChange={(event) => setAltText(event.target.value)}
          />
        </label>
        <button
          className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-bold disabled:opacity-40"
          type="button"
          disabled={disabled || altText.trim() === (photo.altText ?? "")}
          onClick={() => onAltText(altText.trim() || null)}
        >
          Save alt text
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            className="min-h-10 rounded-lg border border-slate-300 px-2 text-sm font-bold disabled:opacity-40"
            type="button"
            disabled={disabled || index === 0}
            onClick={() => onMove(-1)}
          >
            Move earlier
          </button>
          <button
            className="min-h-10 rounded-lg border border-slate-300 px-2 text-sm font-bold disabled:opacity-40"
            type="button"
            disabled={disabled || index === total - 1}
            onClick={() => onMove(1)}
          >
            Move later
          </button>
          <button
            className="min-h-10 rounded-lg border border-emerald-700 px-2 text-sm font-bold text-emerald-800 disabled:opacity-40"
            type="button"
            disabled={disabled || photo.isCover}
            onClick={onCover}
          >
            Set as cover
          </button>
          <button
            className="min-h-10 rounded-lg border border-red-300 px-2 text-sm font-bold text-red-800 disabled:opacity-40"
            type="button"
            disabled={disabled}
            onClick={onRemove}
          >
            Remove photo
          </button>
        </div>
      </div>
    </article>
  );
}

export function PropertyPhotoStep({
  propertyId,
  propertyName,
  photos,
  editable,
}: PropertyPhotoStepProps) {
  const upload = useUploadPropertyPhotos(propertyId);
  const reorder = useReorderPropertyPhotos(propertyId);
  const setCover = useSetPropertyPhotoCover(propertyId);
  const updateAltText = useUpdatePropertyPhotoAltText(propertyId);
  const remove = useRemovePropertyPhoto(propertyId);
  const [previews, setPreviews] = useState<PreviewFile[]>([]);
  const previewRef = useRef<PreviewFile[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [operationError, setOperationError] = useState<string[] | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const orderedPhotos = [...photos].sort(
    (left, right) => left.sortOrder - right.sortOrder,
  );
  const isBusy =
    upload.isPending ||
    reorder.isPending ||
    setCover.isPending ||
    updateAltText.isPending ||
    remove.isPending;

  function replacePreviews(next: PreviewFile[]): void {
    for (const preview of previewRef.current) URL.revokeObjectURL(preview.url);
    previewRef.current = next;
    setPreviews(next);
  }

  useEffect(
    () => () => {
      for (const preview of previewRef.current)
        URL.revokeObjectURL(preview.url);
    },
    [],
  );

  function selectFiles(event: ChangeEvent<HTMLInputElement>): void {
    const files = Array.from(event.target.files ?? []);
    const errors: string[] = [];
    if (photos.length + files.length > MAX_PROPERTY_PHOTOS) {
      errors.push(
        `Choose no more than ${MAX_PROPERTY_PHOTOS - photos.length} additional photo(s).`,
      );
    }
    for (const file of files) {
      if (!ALLOWED_PROPERTY_PHOTO_TYPES.includes(file.type as never)) {
        errors.push(`${file.name}: choose a JPEG, PNG, or WebP image.`);
      } else if (file.size === 0) {
        errors.push(`${file.name}: the file is empty.`);
      } else if (file.size > MAX_PROPERTY_PHOTO_BYTES) {
        errors.push(`${file.name}: the file exceeds 5 MB.`);
      }
    }

    setValidationErrors(errors);
    setOperationError(null);
    replacePreviews(
      errors.length === 0
        ? files.map((file) => ({ file, url: URL.createObjectURL(file) }))
        : [],
    );
    event.target.value = "";
  }

  async function uploadSelected(): Promise<void> {
    if (!previews.length || isBusy) return;
    setOperationError(null);
    setProgress(0);
    try {
      await upload.mutateAsync({
        files: previews.map((preview) => preview.file),
        onProgress: setProgress,
      });
      replacePreviews([]);
    } catch (error: unknown) {
      setOperationError(safeErrorMessages(error));
    } finally {
      setProgress(null);
    }
  }

  async function run(operation: () => Promise<unknown>): Promise<void> {
    setOperationError(null);
    try {
      await operation();
    } catch (error: unknown) {
      setOperationError(safeErrorMessages(error));
    }
  }

  function movePhoto(index: number, direction: -1 | 1): void {
    const next = [...orderedPhotos];
    const swapIndex = index + direction;
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    void run(() => reorder.mutateAsync(next.map((photo) => photo.id)));
  }

  function removePhoto(photo: PropertyPhoto): void {
    if (!window.confirm("Remove this photo from the property listing?")) return;
    void run(() => remove.mutateAsync(photo.id));
  }

  return (
    <div className="mt-6 space-y-6">
      <div>
        <p className="text-sm text-slate-600">
          Add 1–4 JPEG, PNG, or WebP photos. Each file may be up to 5 MB.
        </p>
        <p className="mt-1 text-sm font-bold text-slate-800" role="status">
          {photos.length} of {MAX_PROPERTY_PHOTOS} photos uploaded
          {!editable ? " · Photo changes are locked in this status" : ""}
        </p>
      </div>

      {operationError ? (
        <ErrorMessage title="Photo operation failed" message={operationError} />
      ) : null}
      {validationErrors.length ? (
        <ErrorMessage
          title="Some files cannot be selected"
          message={validationErrors}
        />
      ) : null}

      {editable && photos.length < MAX_PROPERTY_PHOTOS ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
          <label className="block font-bold" htmlFor="property-photos">
            Select photos
          </label>
          <input
            className="mt-3 block w-full text-sm"
            id="property-photos"
            name={PROPERTY_PHOTO_FIELD_NAME}
            type="file"
            accept={ALLOWED_PROPERTY_PHOTO_TYPES.join(",")}
            multiple
            disabled={isBusy}
            onChange={selectFiles}
          />
        </div>
      ) : null}

      {previews.length ? (
        <div>
          <h3 className="font-black">Ready to upload</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {previews.map((preview) => (
              <figure
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                key={`${preview.file.name}-${preview.file.lastModified}`}
              >
                <img
                  className="aspect-[4/3] w-full object-cover"
                  src={preview.url}
                  alt="Selected photo preview"
                />
                <figcaption className="p-3 text-xs text-slate-600">
                  {preview.file.name} · {(preview.file.size / 1024).toFixed(1)}{" "}
                  KB
                </figcaption>
              </figure>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              className="min-h-11 rounded-xl bg-emerald-700 px-5 font-black text-white disabled:opacity-50"
              type="button"
              disabled={isBusy}
              onClick={() => void uploadSelected()}
            >
              {upload.isPending ? "Uploading…" : "Upload selected photos"}
            </button>
            <button
              className="min-h-11 rounded-xl border border-slate-300 px-5 font-bold disabled:opacity-50"
              type="button"
              disabled={isBusy}
              onClick={() => replacePreviews([])}
            >
              Clear selection
            </button>
          </div>
          {progress !== null ? (
            <progress
              className="mt-4 w-full"
              max={100}
              value={progress}
              aria-label="Photo upload progress"
            >
              {progress}%
            </progress>
          ) : null}
        </div>
      ) : null}

      {orderedPhotos.length ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {orderedPhotos.map((photo, index) => (
            <PhotoCard
              key={`${photo.id}-${photo.altText ?? ""}`}
              photo={photo}
              index={index}
              total={orderedPhotos.length}
              propertyName={propertyName}
              disabled={!editable || isBusy}
              onCover={() => void run(() => setCover.mutateAsync(photo.id))}
              onMove={(direction) => movePhoto(index, direction)}
              onRemove={() => removePhoto(photo)}
              onAltText={(altText) =>
                void run(() =>
                  updateAltText.mutateAsync({ photoId: photo.id, altText }),
                )
              }
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
          No photos uploaded yet. At least one photo is required before
          submission.
        </div>
      )}
    </div>
  );
}
