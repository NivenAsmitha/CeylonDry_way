import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import {
  useFieldArray,
  useForm,
  useWatch,
  type FieldPath,
} from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ErrorMessage } from "../../../components/common/ErrorMessage";
import { FormField } from "../../../components/common/FormField";
import { normalizeApiError } from "../../../types/api.types";
import {
  propertyFormSchema,
  propertySubmissionSchema,
  type PropertyFormValues,
} from "../schemas/property-form.schema";
import {
  useCreatePropertyDraft,
  usePropertyAmenities,
  useSubmitPropertyDraft,
  useUpdatePropertyDraft,
} from "../hooks/useOwnerProperties";
import {
  PROPERTY_TYPES,
  type OwnerProperty,
  type PropertyDraftInput,
} from "../types/property.types";
import {
  PROPERTY_FORM_STEPS,
  PROPERTY_TYPE_LABELS,
} from "../property.constants";
import { PropertyStatusBadge } from "./PropertyStatusBadge";
import { PropertyStepIndicator } from "./PropertyStepIndicator";

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const fieldSteps: Record<keyof PropertyFormValues, number> = {
  propertyType: 1,
  name: 1,
  organisation: 1,
  description: 1,
  amenityCodes: 2,
  accessNotes: 3,
  isFree: 3,
  feeLkr: 3,
  openingHours: 3,
  phone: 4,
  email: 4,
  website: 4,
  address: 5,
  district: 5,
  city: 5,
  latitude: 5,
  longitude: 5,
};

function emptyToNull(value: string): string | null {
  const normalized = value.trim();
  return normalized || null;
}

function numberOrNull(value: string): number | null {
  const normalized = value.trim();
  return normalized === "" ? null : Number(normalized);
}

function getDefaultValues(property?: OwnerProperty): PropertyFormValues {
  const version = property?.activeVersion;

  return {
    propertyType: version?.propertyType ?? "",
    name: version?.name ?? "",
    organisation: version?.organisation ?? "",
    description: version?.description ?? "",
    amenityCodes: version?.amenities.map((amenity) => amenity.code) ?? [],
    accessNotes: version?.accessNotes ?? "",
    isFree: version?.isFree ?? true,
    feeLkr:
      version?.feeLkr === null || version?.feeLkr === undefined
        ? ""
        : String(version.feeLkr),
    phone: version?.phone ?? "",
    email: version?.email ?? "",
    website: version?.website ?? "",
    address: version?.address ?? "",
    district: version?.district ?? "",
    city: version?.city ?? "",
    latitude:
      version?.latitude === null || version?.latitude === undefined
        ? ""
        : String(version.latitude),
    longitude:
      version?.longitude === null || version?.longitude === undefined
        ? ""
        : String(version.longitude),
    openingHours:
      version?.openingHours.map((openingHour) => ({
        weekday: openingHour.weekday,
        isClosed: openingHour.isClosed,
        is24Hours: openingHour.is24Hours,
        openTime: openingHour.openTime ?? "",
        closeTime: openingHour.closeTime ?? "",
      })) ?? [],
  };
}

function toDraftInput(values: PropertyFormValues): PropertyDraftInput {
  return {
    propertyType: values.propertyType || null,
    name: emptyToNull(values.name),
    organisation: emptyToNull(values.organisation),
    description: emptyToNull(values.description),
    amenityCodes: values.amenityCodes,
    accessNotes: emptyToNull(values.accessNotes),
    isFree: values.isFree,
    feeLkr: values.isFree ? null : numberOrNull(values.feeLkr),
    phone: emptyToNull(values.phone),
    email: emptyToNull(values.email),
    website: emptyToNull(values.website),
    address: emptyToNull(values.address),
    district: emptyToNull(values.district),
    city: emptyToNull(values.city),
    latitude: numberOrNull(values.latitude),
    longitude: numberOrNull(values.longitude),
    openingHours: values.openingHours.map((openingHour) => ({
      weekday: openingHour.weekday,
      isClosed: openingHour.isClosed,
      is24Hours: openingHour.is24Hours,
      openTime:
        openingHour.isClosed || openingHour.is24Hours
          ? null
          : emptyToNull(openingHour.openTime),
      closeTime:
        openingHour.isClosed || openingHour.is24Hours
          ? null
          : emptyToNull(openingHour.closeTime),
    })),
  };
}

function getFieldStep(field: string): number {
  const rootField = field.split(".")[0] as keyof PropertyFormValues;
  return fieldSteps[rootField] ?? 7;
}

function TextAreaField({
  id,
  label,
  error,
  hint,
  rows = 5,
  registration,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  rows?: number;
  registration: ReturnType<
    ReturnType<typeof useForm<PropertyFormValues>>["register"]
  >;
}) {
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div>
      <label className="mb-2 block text-sm font-semibold" htmlFor={id}>
        {label}
      </label>
      <textarea
        {...registration}
        className={`w-full rounded-xl border bg-white px-4 py-3 shadow-sm outline-none focus:ring-4 ${
          error
            ? "border-red-400 focus:ring-red-100"
            : "border-slate-300 focus:border-emerald-600 focus:ring-emerald-100"
        }`}
        id={id}
        rows={rows}
        aria-invalid={Boolean(error)}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ")}
      />
      {hint ? (
        <p className="mt-2 text-xs text-slate-500" id={hintId}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 text-sm font-medium text-red-700" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

interface PropertyFormProps {
  property?: OwnerProperty;
}

export function PropertyForm({ property }: PropertyFormProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedStep = Number(searchParams.get("step"));
  const initialStep =
    Number.isInteger(requestedStep) && requestedStep >= 1 && requestedStep <= 7
      ? requestedStep
      : property?.canEdit === false
        ? 7
        : 1;
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [visitedStep, setVisitedStep] = useState(property ? 7 : 1);
  const [serverError, setServerError] = useState<string[] | null>(null);
  const [saveSucceeded, setSaveSucceeded] = useState(false);
  const [submissionConfirmed, setSubmissionConfirmed] = useState(false);
  const createMutation = useCreatePropertyDraft();
  const updateMutation = useUpdatePropertyDraft(property?.id ?? "new");
  const submitMutation = useSubmitPropertyDraft(property?.id ?? "new");
  const amenitiesQuery = usePropertyAmenities();
  const saveInFlight = useRef<Promise<OwnerProperty | null> | null>(null);
  const submissionInFlight = useRef<Promise<void> | null>(null);
  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    getValues,
    trigger,
    formState: { errors, isDirty },
  } = useForm<PropertyFormValues>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: getDefaultValues(property),
  });
  const openingHours = useFieldArray({ control, name: "openingHours" });
  const isFree = useWatch({ control, name: "isFree" });
  const values = useWatch({ control });
  const isEditable = property?.canEdit ?? true;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (!isDirty || !isEditable) {
      return;
    }

    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [isDirty, isEditable]);

  function applyBackendErrors(error: unknown): void {
    const normalized = normalizeApiError(error);
    setServerError(normalized.messages);

    if (normalized.details.length === 0) {
      return;
    }

    let earliestStep = 7;

    for (const detail of normalized.details) {
      const root = detail.field.split(".")[0];

      if (root in fieldSteps) {
        setError(root as FieldPath<PropertyFormValues>, {
          type: "server",
          message: detail.message,
        });
        earliestStep = Math.min(earliestStep, getFieldStep(root));
      }
    }

    setCurrentStep(earliestStep);
  }

  async function persistDraft(
    formValues: PropertyFormValues,
    nextStep?: number,
  ): Promise<OwnerProperty | null> {
    if (saveInFlight.current) {
      return saveInFlight.current;
    }

    const operation = (async () => {
      setServerError(null);
      setSaveSucceeded(false);

      try {
        const savedProperty = property
          ? await updateMutation.mutateAsync(toDraftInput(formValues))
          : await createMutation.mutateAsync(toDraftInput(formValues));

        reset(getDefaultValues(savedProperty));
        setSaveSucceeded(true);

        if (!property) {
          navigate(
            `/owner/properties/${savedProperty.id}/edit${
              nextStep ? `?step=${nextStep}` : ""
            }`,
            { replace: true },
          );
        }

        return savedProperty;
      } catch (error: unknown) {
        applyBackendErrors(error);
        return null;
      } finally {
        saveInFlight.current = null;
      }
    })();

    saveInFlight.current = operation;
    return operation;
  }

  async function validateCurrentStep(): Promise<boolean> {
    const clientFields = Object.entries(fieldSteps)
      .filter(([, step]) => step === currentStep)
      .map(([field]) => field as FieldPath<PropertyFormValues>);
    const fieldsValid = await trigger(clientFields, { shouldFocus: true });
    const submission = propertySubmissionSchema.safeParse(getValues());
    const currentStepIssues = submission.success
      ? []
      : submission.error.issues.filter(
          (issue) => getFieldStep(String(issue.path[0])) === currentStep,
        );

    for (const issue of currentStepIssues) {
      const field = String(issue.path[0]);
      if (field in fieldSteps) {
        setError(field as FieldPath<PropertyFormValues>, {
          type: "validate",
          message: issue.message,
        });
      }
    }

    return fieldsValid && currentStepIssues.length === 0;
  }

  async function goToNextStep(): Promise<void> {
    if (!(await validateCurrentStep())) {
      return;
    }

    const nextStep = Math.min(7, currentStep + 1);
    const saved = await persistDraft(getValues(), nextStep);

    if (saved && property) {
      setVisitedStep((visited) => Math.max(visited, nextStep));
      setCurrentStep(nextStep);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function submitProperty(): Promise<void> {
    if (submissionInFlight.current || !property) {
      return;
    }

    const operation = (async () => {
      setServerError(null);
      const validation = propertySubmissionSchema.safeParse(getValues());

      if (!validation.success) {
        let earliestStep = 7;
        for (const issue of validation.error.issues) {
          const field = String(issue.path[0]);
          if (field in fieldSteps) {
            setError(field as FieldPath<PropertyFormValues>, {
              type: "validate",
              message: issue.message,
            });
            earliestStep = Math.min(earliestStep, getFieldStep(field));
          }
        }
        setCurrentStep(earliestStep);
        setServerError(["Complete the highlighted fields before submitting."]);
        return;
      }

      if (!submissionConfirmed) {
        setServerError(["Confirm that the listing is ready for review."]);
        return;
      }

      const saved = await persistDraft(validation.data);
      if (!saved) {
        return;
      }

      try {
        const submitted = await submitMutation.mutateAsync();
        reset(getDefaultValues(submitted));
        setSubmissionConfirmed(false);
        setCurrentStep(7);
      } catch (error: unknown) {
        applyBackendErrors(error);
      }
    })().finally(() => {
      submissionInFlight.current = null;
    });

    submissionInFlight.current = operation;
    await operation;
  }

  const selectedName = values.name?.trim() || "Untitled property";

  return (
    <div className="space-y-6">
      <PropertyStepIndicator
        currentStep={currentStep}
        visitedStep={visitedStep}
        onSelect={setCurrentStep}
      />

      {property ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Saved backend draft
            </p>
            <p className="font-bold text-slate-950">{selectedName}</p>
          </div>
          <PropertyStatusBadge status={property.lifecycleStatus} />
        </div>
      ) : null}

      {!isEditable ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          This listing is {property?.lifecycleStatus.toLowerCase()}. Owner edits
          are disabled while it is in this state.
        </div>
      ) : null}
      {property?.latestDecision ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-black">Latest reviewer feedback</p>
          <p className="mt-1 font-semibold">
            {property.latestDecision.decision
              .toLowerCase()
              .split("_")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ")}
          </p>
          {property.latestDecision.reason ? (
            <p className="mt-2 whitespace-pre-wrap">
              {property.latestDecision.reason}
            </p>
          ) : null}
          {property.lifecycleStatus === "CHANGES_REQUESTED" ? (
            <p className="mt-2 font-semibold">
              You can edit this listing and resubmit it for review.
            </p>
          ) : null}
        </div>
      ) : null}
      {isDirty && isEditable ? (
        <div
          className="rounded-2xl border border-sky-200 bg-sky-50 p-3 text-sm font-semibold text-sky-950"
          role="status"
        >
          You have unsaved changes. Save before leaving this page.
        </div>
      ) : null}
      {serverError ? (
        <ErrorMessage
          title="Property could not be saved"
          message={serverError}
        />
      ) : null}
      {saveSucceeded ? (
        <div
          className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-950"
          role="status"
        >
          Draft saved to your account.
        </div>
      ) : null}

      <form
        noValidate
        onSubmit={(event) =>
          void handleSubmit((data) => persistDraft(data))(event)
        }
      >
        <fieldset
          disabled={!isEditable}
          className="space-y-6 disabled:opacity-75"
        >
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <p className="text-sm font-bold text-emerald-700">
              Step {currentStep} of 7
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              {PROPERTY_FORM_STEPS[currentStep - 1]}
            </h2>

            {currentStep === 1 ? (
              <div className="mt-6 grid gap-5">
                <div>
                  <label
                    className="mb-2 block text-sm font-semibold"
                    htmlFor="property-type"
                  >
                    Property type
                  </label>
                  <select
                    className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-100"
                    id="property-type"
                    aria-invalid={Boolean(errors.propertyType)}
                    {...register("propertyType")}
                  >
                    <option value="">Select a type</option>
                    {PROPERTY_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {PROPERTY_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                  {errors.propertyType?.message ? (
                    <p className="mt-2 text-sm font-medium text-red-700">
                      {errors.propertyType.message}
                    </p>
                  ) : null}
                </div>
                <FormField
                  id="property-name"
                  label="Property name"
                  error={errors.name?.message}
                  {...register("name")}
                />
                <FormField
                  id="property-organisation"
                  label="Organisation (optional)"
                  error={errors.organisation?.message}
                  {...register("organisation")}
                />
                <TextAreaField
                  id="property-description"
                  label="Description"
                  hint="Use at least 50 characters before submission."
                  error={errors.description?.message}
                  registration={register("description")}
                />
              </div>
            ) : null}

            {currentStep === 2 ? (
              <div className="mt-6">
                <p className="text-sm text-slate-600">
                  Select the controlled facilities currently available at this
                  property.
                </p>
                {amenitiesQuery.isPending ? (
                  <p className="mt-4 text-sm font-semibold">
                    Loading amenities...
                  </p>
                ) : amenitiesQuery.isError ? (
                  <div className="mt-4">
                    <ErrorMessage message="Amenities could not be loaded." />
                  </div>
                ) : (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {amenitiesQuery.data?.map((amenity) => (
                      <label
                        className="flex min-h-14 items-start gap-3 rounded-xl border border-slate-200 p-4 hover:border-emerald-400"
                        key={amenity.code}
                      >
                        <input
                          className="mt-1 size-5 accent-emerald-700"
                          type="checkbox"
                          value={amenity.code}
                          {...register("amenityCodes")}
                        />
                        <span>
                          <span className="block font-bold">
                            {amenity.name}
                          </span>
                          {amenity.description ? (
                            <span className="mt-1 block text-xs text-slate-500">
                              {amenity.description}
                            </span>
                          ) : null}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                {errors.amenityCodes?.message ? (
                  <p className="mt-3 text-sm font-medium text-red-700">
                    {errors.amenityCodes.message}
                  </p>
                ) : null}
              </div>
            ) : null}

            {currentStep === 3 ? (
              <div className="mt-6 space-y-6">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <label className="flex items-center gap-3 font-bold">
                    <input
                      className="size-5 accent-emerald-700"
                      type="checkbox"
                      {...register("isFree")}
                    />
                    Access is free
                  </label>
                </div>
                {!isFree ? (
                  <FormField
                    id="property-fee"
                    label="Fee (LKR)"
                    type="number"
                    min="0"
                    step="0.01"
                    error={errors.feeLkr?.message}
                    {...register("feeLkr")}
                  />
                ) : null}
                <TextAreaField
                  id="property-access-notes"
                  label="Access notes"
                  hint="Describe entrances, restrictions, directions, or accessibility information."
                  error={errors.accessNotes?.message}
                  registration={register("accessNotes")}
                />

                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-black">Opening hours</h3>
                      <p className="text-sm text-slate-500">
                        Add only the days you want to describe.
                      </p>
                    </div>
                    <button
                      className="min-h-11 rounded-xl border border-emerald-700 px-4 py-2 text-sm font-bold text-emerald-800"
                      type="button"
                      disabled={openingHours.fields.length >= 7}
                      onClick={() =>
                        openingHours.append({
                          weekday: openingHours.fields.length,
                          isClosed: false,
                          is24Hours: false,
                          openTime: "08:00",
                          closeTime: "17:00",
                        })
                      }
                    >
                      Add day
                    </button>
                  </div>
                  <div className="mt-4 space-y-4">
                    {openingHours.fields.map((field, index) => {
                      const entry = values.openingHours?.[index];
                      const hideTimes = entry?.isClosed || entry?.is24Hours;

                      return (
                        <div
                          className="grid gap-3 rounded-2xl border border-slate-200 p-4 lg:grid-cols-[1fr_auto_auto_1fr_1fr_auto] lg:items-end"
                          key={field.id}
                        >
                          <div>
                            <label
                              className="mb-1 block text-xs font-bold"
                              htmlFor={`weekday-${index}`}
                            >
                              Day
                            </label>
                            <select
                              className="min-h-11 w-full rounded-lg border border-slate-300 px-3"
                              id={`weekday-${index}`}
                              {...register(`openingHours.${index}.weekday`, {
                                valueAsNumber: true,
                              })}
                            >
                              {WEEKDAYS.map((weekday, weekdayIndex) => (
                                <option key={weekday} value={weekdayIndex}>
                                  {weekday}
                                </option>
                              ))}
                            </select>
                          </div>
                          <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
                            <input
                              type="checkbox"
                              {...register(`openingHours.${index}.isClosed`)}
                            />
                            Closed
                          </label>
                          <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
                            <input
                              type="checkbox"
                              {...register(`openingHours.${index}.is24Hours`)}
                            />
                            24 hours
                          </label>
                          {!hideTimes ? (
                            <>
                              <FormField
                                id={`open-${index}`}
                                label="Opens"
                                type="time"
                                error={
                                  errors.openingHours?.[index]?.openTime
                                    ?.message
                                }
                                {...register(`openingHours.${index}.openTime`)}
                              />
                              <FormField
                                id={`close-${index}`}
                                label="Closes"
                                type="time"
                                error={
                                  errors.openingHours?.[index]?.closeTime
                                    ?.message
                                }
                                {...register(`openingHours.${index}.closeTime`)}
                              />
                            </>
                          ) : (
                            <p className="text-sm text-slate-500 lg:col-span-2">
                              No times required
                            </p>
                          )}
                          <button
                            className="min-h-11 rounded-lg border border-red-200 px-3 text-sm font-bold text-red-700"
                            type="button"
                            onClick={() => openingHours.remove(index)}
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  {errors.openingHours?.root?.message ? (
                    <p className="mt-3 text-sm font-medium text-red-700">
                      {errors.openingHours.root.message}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {currentStep === 4 ? (
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <FormField
                  id="property-phone"
                  label="Public phone (optional)"
                  type="tel"
                  error={errors.phone?.message}
                  {...register("phone")}
                />
                <FormField
                  id="property-email"
                  label="Public email (optional)"
                  type="email"
                  error={errors.email?.message}
                  {...register("email")}
                />
                <FormField
                  id="property-website"
                  label="Website (optional)"
                  type="url"
                  className="sm:col-span-2"
                  error={errors.website?.message}
                  {...register("website")}
                />
              </div>
            ) : null}

            {currentStep === 5 ? (
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <FormField
                    id="property-address"
                    label="Street address"
                    error={errors.address?.message}
                    {...register("address")}
                  />
                </div>
                <FormField
                  id="property-district"
                  label="District"
                  error={errors.district?.message}
                  {...register("district")}
                />
                <FormField
                  id="property-city"
                  label="City"
                  error={errors.city?.message}
                  {...register("city")}
                />
                <FormField
                  id="property-latitude"
                  label="Latitude"
                  type="number"
                  step="0.0000001"
                  hint="Manual coordinates for this phase."
                  error={errors.latitude?.message}
                  {...register("latitude")}
                />
                <FormField
                  id="property-longitude"
                  label="Longitude"
                  type="number"
                  step="0.0000001"
                  hint="Google Maps integration comes later."
                  error={errors.longitude?.message}
                  {...register("longitude")}
                />
              </div>
            ) : null}

            {currentStep === 6 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <p className="text-lg font-black">Photos are coming next</p>
                <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
                  This phase does not upload files or store browser-selected
                  images. Cloud storage integration will be added later.
                </p>
              </div>
            ) : null}

            {currentStep === 7 ? (
              <div className="mt-6 space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    ["Property", selectedName],
                    [
                      "Type",
                      values.propertyType
                        ? PROPERTY_TYPE_LABELS[values.propertyType]
                        : "Not provided",
                    ],
                    [
                      "Access",
                      values.isFree
                        ? "Free"
                        : values.feeLkr
                          ? `LKR ${values.feeLkr}`
                          : "Paid - fee missing",
                    ],
                    [
                      "Location",
                      [values.address, values.city, values.district]
                        .filter(Boolean)
                        .join(", ") || "Not provided",
                    ],
                    [
                      "Amenities",
                      `${values.amenityCodes?.length ?? 0} selected`,
                    ],
                    [
                      "Opening entries",
                      String(values.openingHours?.length ?? 0),
                    ],
                  ].map(([label, value]) => (
                    <div className="rounded-2xl bg-slate-50 p-4" key={label}>
                      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        {label}
                      </dt>
                      <dd className="mt-1 font-bold text-slate-950">{value}</dd>
                    </div>
                  ))}
                </div>
                <div>
                  <h3 className="font-black">Description</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                    {values.description || "Not provided"}
                  </p>
                </div>
                {property?.canSubmit ? (
                  <label className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 font-semibold text-amber-950">
                    <input
                      className="mt-1 size-5 accent-emerald-700"
                      type="checkbox"
                      checked={submissionConfirmed}
                      onChange={(event) =>
                        setSubmissionConfirmed(event.target.checked)
                      }
                    />
                    <span>
                      I confirm this listing is complete and ready for reviewer
                      approval.
                    </span>
                  </label>
                ) : null}
              </div>
            ) : null}
          </div>
        </fieldset>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            className="min-h-12 rounded-xl border border-slate-300 px-5 py-3 font-bold disabled:cursor-not-allowed disabled:opacity-40"
            type="button"
            disabled={currentStep === 1}
            onClick={() => setCurrentStep((step) => Math.max(1, step - 1))}
          >
            Previous
          </button>
          <div className="flex flex-col gap-3 sm:flex-row">
            {isEditable ? (
              <button
                className="min-h-12 rounded-xl border border-emerald-700 px-5 py-3 font-extrabold text-emerald-800 disabled:cursor-wait disabled:opacity-60"
                type="submit"
                disabled={isSaving || submitMutation.isPending}
              >
                {isSaving
                  ? "Saving..."
                  : property
                    ? "Save draft"
                    : "Start and save draft"}
              </button>
            ) : null}
            {currentStep < 7 && isEditable ? (
              <button
                className="min-h-12 rounded-xl bg-emerald-700 px-6 py-3 font-extrabold text-white disabled:cursor-wait disabled:opacity-60"
                type="button"
                disabled={isSaving}
                onClick={() => void goToNextStep()}
              >
                Save and continue
              </button>
            ) : null}
            {currentStep === 7 && property?.canSubmit ? (
              <button
                className="min-h-12 rounded-xl bg-amber-500 px-6 py-3 font-extrabold text-slate-950 disabled:cursor-wait disabled:opacity-60"
                type="button"
                disabled={isSaving || submitMutation.isPending}
                onClick={() => void submitProperty()}
              >
                {submitMutation.isPending
                  ? "Submitting..."
                  : "Submit for review"}
              </button>
            ) : null}
          </div>
        </div>
      </form>
    </div>
  );
}
