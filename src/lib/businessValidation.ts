type BusinessDetailsInput = {
  name?: string;
  address?: string;
  category?: string;
  description?: string;
  googlePlaceId?: string;
};

export function validateBusinessDetails(input: BusinessDetailsInput): string | null {
  if (!input.name?.trim()) return "Business name is required";
  if (!input.address?.trim()) return "Address is required";
  if (!input.category?.trim()) return "Category is required";
  if (!input.description?.trim()) return "Business description is required";
  if (!input.googlePlaceId?.trim()) return "Google Place ID is required";
  return null;
}

export function normalizeBusinessDetails(input: BusinessDetailsInput) {
  return {
    name: input.name!.trim(),
    address: input.address!.trim(),
    category: input.category!.trim(),
    description: input.description!.trim(),
    googlePlaceId: input.googlePlaceId!.trim(),
  };
}
