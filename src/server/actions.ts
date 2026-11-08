import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { encodeActionError, isDomainError, rethrowIfNextRedirect } from "@/lib/errors";

export interface SafeActionConfig<TInput, TOutput> {
  parse?: (formData: FormData) => TInput;
  handler: (input: TInput, formData: FormData) => Promise<TOutput>;
  revalidatePaths?: string[];
  redirectTo?: (output: TOutput, input: TInput) => string;
  onErrorRedirect?: (error: unknown, input: TInput, formData: FormData) => string;
}

export function createSafeAction<TInput = FormData, TOutput = unknown>(
  config: SafeActionConfig<TInput, TOutput>
) {
  return async function action(formData: FormData): Promise<void> {
    let input = null as unknown as TInput;
    let output: TOutput;
    try {
      input = config.parse ? config.parse(formData) : formData as unknown as TInput;
      output = await config.handler(input, formData);
    } catch (err) {
      rethrowIfNextRedirect(err);
      if (config.onErrorRedirect) redirect(config.onErrorRedirect(err, input, formData));
      throw err;
    }

    if (config.revalidatePaths) {
      for (const path of config.revalidatePaths) {
        revalidatePath(path);
      }
    }

    if (config.redirectTo) {
      redirect(config.redirectTo(output, input));
    }
  };
}

export { encodeActionError, rethrowIfNextRedirect, isDomainError };
