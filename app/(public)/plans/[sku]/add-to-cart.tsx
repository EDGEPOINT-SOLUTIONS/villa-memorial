"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCart, type CartLine } from "@/lib/cart/cart-context";

type Props = { item: Omit<CartLine, "quantity"> };

export function AddToCartControl({ item }: Props) {
  const router = useRouter();
  const cart = useCart();
  const [added, setAdded] = useState(false);

  return (
    <div className="row row--wrap">
      <Button
        onClick={() => {
          cart.add(item);
          setAdded(true);
        }}
      >
        {added ? "Added ✓ — add more" : "Add to cart"}
      </Button>
      {added ? (
        <Button variant="secondary" onClick={() => router.push("/checkout")}>
          Go to checkout
        </Button>
      ) : null}
    </div>
  );
}
