"use client";

import { useRouter } from "next/navigation";
import { InquiryCaptureForm } from "../inquiry-capture";

/** The dedicated capture page's form — writes the same durable route as the board. */
export function NewInquiryForm() {
  const router = useRouter();
  return (
    <InquiryCaptureForm
      submitLabel="Record inquiry"
      onCaptured={() => {
        router.push("/staff/inquiries");
        router.refresh();
      }}
    />
  );
}
