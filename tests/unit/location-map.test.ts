import { describe, expect, it } from "vitest";
import {
  LOCATION_MAP_NOTE,
  directionsUrl,
  locationPlaces,
  mapSearchUrl,
} from "@/lib/location-map";

/**
 * Location & directions — the pure half of the map-integration task (client's
 * minutes 2026-09-21, item 6).
 *
 * These pin the two things a view must never hand-roll:
 *  · the ORDER and the honesty of the recorded places (park first, blanks
 *    dropped, never an invented address);
 *  · the provider URL construction from a free-text recorded address (the
 *    navigation assistance), encoded so a comma or an ampersand cannot break
 *    the query.
 *
 * The static-card decision (no third-party embed without an approved pin) is
 * documented in the module header; the note is asserted here so a future
 * change cannot quietly claim the card is a live map.
 */

const CONTACT = {
  officeAddress: "Capilla de San Jose Bldg., Sunrise, Isabela City, Basilan",
  parkAddress: "Sanctuario de Mercedes y Gloria, Purok 3, Begang, Isabela City, Basilan",
};

describe("the recorded places", () => {
  it("leads with the park and follows with the office", () => {
    expect(locationPlaces(CONTACT)).toEqual([
      { id: "park", label: "Villa Memorial Park", address: CONTACT.parkAddress },
      { id: "office", label: "Main office", address: CONTACT.officeAddress },
    ]);
  });

  it("drops a blank address instead of rendering an empty pin", () => {
    expect(locationPlaces({ officeAddress: "", parkAddress: CONTACT.parkAddress })).toEqual([
      { id: "park", label: "Villa Memorial Park", address: CONTACT.parkAddress },
    ]);
    expect(locationPlaces({ officeAddress: CONTACT.officeAddress, parkAddress: "  " })).toEqual([
      { id: "office", label: "Main office", address: CONTACT.officeAddress },
    ]);
    expect(locationPlaces({ officeAddress: "", parkAddress: "" })).toEqual([]);
  });

  it("trims the recorded address it hands to the maps URL", () => {
    const [park] = locationPlaces({ officeAddress: "", parkAddress: `  ${CONTACT.parkAddress}  ` });
    expect(park.address).toBe(CONTACT.parkAddress);
  });
});

describe("directions URLs are built from the recorded address", () => {
  it("Google gets an encoded turn-by-turn destination", () => {
    const url = directionsUrl("google", CONTACT.parkAddress);
    expect(url).toBe(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(CONTACT.parkAddress)}`,
    );
    // The raw comma/space must be encoded, not interpolated.
    expect(url).toContain("%2C");
    expect(url).not.toContain(" ");
  });

  it("Apple gets the same address through its own directions parameter", () => {
    const url = directionsUrl("apple", CONTACT.officeAddress);
    expect(url).toBe(
      `https://maps.apple.com/?daddr=${encodeURIComponent(CONTACT.officeAddress)}&dirflg=d`,
    );
    expect(url).toContain("daddr=");
  });

  it("a plain map view is a different URL from a route", () => {
    const view = mapSearchUrl("google", CONTACT.parkAddress);
    expect(view).toBe(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CONTACT.parkAddress)}`,
    );
    expect(view).not.toBe(directionsUrl("google", CONTACT.parkAddress));
    expect(mapSearchUrl("apple", CONTACT.parkAddress)).toBe(
      `https://maps.apple.com/?q=${encodeURIComponent(CONTACT.parkAddress)}`,
    );
  });

  it("trims before encoding so a trailing space cannot create an empty query", () => {
    expect(directionsUrl("google", "  Isabela City  ")).toBe(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent("Isabela City")}`,
    );
  });
});

describe("the honesty note says the card is not a live map", () => {
  it("names it static and names both directions providers", () => {
    expect(LOCATION_MAP_NOTE).toMatch(/static/i);
    expect(LOCATION_MAP_NOTE).toContain("Google Maps");
    expect(LOCATION_MAP_NOTE).toContain("Apple Maps");
  });
});
