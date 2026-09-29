"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart, type CartLine } from "@/lib/cart/cart-context";

type Props = {
  item: Omit<CartLine, "quantity">;
  /** Show the cart glyph before the label (the package page's reference card). */
  withIcon?: boolean;
};

export function AddToCartControl({ item, withIcon = false }: Props) {
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
        {withIcon && !added ? <ShoppingCart aria-hidden="true" size={16} /> : null}
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
