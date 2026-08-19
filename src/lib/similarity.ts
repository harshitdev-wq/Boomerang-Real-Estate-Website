/**
 * Explainable recommendation engine (v1).
 *
 * Transparent scoring algorithm — no ML. Weights:
 *   Location similarity (same city)  30%
 *   Price similarity                 25%
 *   Property type match              20%
 *   Area similarity                  15%
 *   Bedroom count similarity         10%
 *
 * Each dimension returns 0..1 and the weighted sum is the final score.
 * Every recommendation ships with human-readable reasons so users can see
 * exactly why a listing was suggested.
 */
import type { Property } from "./types";

export interface SimilarityResult {
  score: number;
  reasons: string[];
}

const W = { location: 0.3, price: 0.25, type: 0.2, area: 0.15, beds: 0.1 } as const;

export function similarityScore(base: Property, other: Property): SimilarityResult {
  const reasons: string[] = [];

  const locScore = other.city === base.city ? 1 : other.region === base.region ? 0.6 : 0;
  if (locScore === 1) reasons.push("Same city");
  else if (locScore > 0) reasons.push("Same state");

  const basePrice = Math.max(1, base.price);
  const otherPrice = Math.max(1, other.price);
  const priceScore = 1 - Math.min(1, Math.abs(Math.log(otherPrice / basePrice)) / Math.log(3));
  if (priceScore > 0.85) {
    const pct = Math.round(Math.abs((otherPrice - basePrice) / basePrice) * 100);
    reasons.push(`Price within ${pct}%`);
  }

  const typeScore = other.type === base.type ? 1 : 0;
  if (typeScore === 1) reasons.push("Same property type");

  const areaScore = 1 - Math.min(1, Math.abs(Math.log(other.area / Math.max(1, base.area))) / Math.log(2));
  if (areaScore > 0.85) reasons.push("Similar size");

  const bedsScore = 1 - Math.min(1, Math.abs(other.bedrooms - base.bedrooms) / 3);
  if (bedsScore === 1) reasons.push("Same bedroom count");

  const score =
    W.location * locScore + W.price * priceScore + W.type * typeScore + W.area * areaScore + W.beds * bedsScore;

  return { score: Math.round(score * 100) / 100, reasons };
}

export function recommend(
  base: Property,
  all: Property[],
  n = 3,
): { property: Property; score: number; reasons: string[] }[] {
  return all
    .filter((p) => p.id !== base.id && p.status === "published")
    .map((p) => {
      const { score, reasons } = similarityScore(base, p);
      return { property: p, score, reasons };
    })
    .filter((r) => r.score > 0.15)
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}
