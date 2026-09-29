"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuoteBasket, type QuoteLine } from "@/lib/quote-basket/quote-basket-context";

type Props = {
  item: Omit<QuoteLine, "quantity">;
  /** Show a small add mark before the label (the package page's reference card). */
  withIcon?: boolean;
};

export function AddToQuoteControl({ item, withIcon = false }: Props) {
  const router = useRouter();
  const quote = useQuoteBasket();
  const [added, setAdded] = useState(false);

  return (
    <div className="row row--wrap">
      <Button
        onClick={() => {
          quote.add(item);
          setAdded(true);
        }}
      >
        {withIcon && !added ? <Plus aria-hidden="true" size={16} /> : null}
        {added ? "Added ✓ — add more" : "Add to quote"}
      </Button>
      {added ? (
        <Button variant="secondary" onClick={() => router.push("/checkout")}>
          Send the quote
        </Button>
      ) : null}
    </div>
  );
}
