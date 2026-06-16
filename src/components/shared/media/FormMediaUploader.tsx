import type { Control, FieldValues, Path, RegisterOptions } from "react-hook-form";
import { Controller } from "react-hook-form";
import { UniversalMediaUploader, type UniversalMediaUploaderProps } from "./UniversalMediaUploader";

export interface FormMediaUploaderProps<TFieldValues extends FieldValues> extends Omit<
  UniversalMediaUploaderProps,
  "onFilesChange"
> {
  /** react-hook-form control object from useForm() */
  control: Control<TFieldValues>;
  /** Field name in the form schema */
  name: Path<TFieldValues>;
  /** Optional validation rules passed to react-hook-form */
  rules?: RegisterOptions<TFieldValues, Path<TFieldValues>>;
}

/**
 * FormMediaUploader — drop-in wrapper for UniversalMediaUploader inside
 * react-hook-form forms. Automatically binds selected files to the form
 * field and surfaces validation errors below the uploader.
 *
 * @example
 * ```tsx
 * const form = useForm<{ documents: File[] }>();
 *
 * <FormMediaUploader
 *   control={form.control}
 *   name="documents"
 *   preset="multi-pdf"
 *   rules={{ required: "Please upload at least one document." }}
 * />
 * ```
 */
export function FormMediaUploader<TFieldValues extends FieldValues>({
  control,
  name,
  rules,
  ...uploaderProps
}: FormMediaUploaderProps<TFieldValues>) {
  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field, fieldState }) => (
        <div className="space-y-1.5">
          <UniversalMediaUploader
            {...uploaderProps}
            onFilesChange={(files) => field.onChange(files)}
          />
          {fieldState.error && <p className="text-xs text-red-500">{fieldState.error.message}</p>}
        </div>
      )}
    />
  );
}
