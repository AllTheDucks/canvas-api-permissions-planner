export type Scope = "Account" | "Course";

export type PermissionRef = {
  label: string;
  scope: Set<Scope>;
};

export type SinglePermission = {
  symbol: string;
  required?: boolean;
  note?: string;
};

export type AnyOfPermission = {
  anyOf: string[];
  required?: boolean;
  note?: string;
};

export type EndpointPermission = SinglePermission | AnyOfPermission;

export type Endpoint = {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  category: string;
  permissions: EndpointPermission[];
  notes?: string;
};

export type SingleAggregated = {
  kind: "single";
  symbol: string;
  label: string;
  scope: Set<Scope>;
  requiredBy: string[];
  optional: boolean;
  notes: string[];
};

export type AnyOfAggregated = {
  kind: "anyOf";
  options: Array<{ symbol: string; label: string; scope: Set<Scope> }>;
  requiredBy: string[];
  optional: boolean;
  notes: string[];
};

export type AggregatedPermission = SingleAggregated | AnyOfAggregated;
