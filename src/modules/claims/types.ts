export interface Claim {
  id: string;
  title: string;
  description: string;
  status: string;
  location: string;
  locationDetail?: string;
  unitId?: string | null;
  unit?: {
    id: string;
    number: string;
    floor: string;
  };
  creatorId: string;
  serviceProviderId?: string | null;
  priority: string;
  comments: any[];
  images: string[];
  createdAt: string;
  updatedAt: string;
}
