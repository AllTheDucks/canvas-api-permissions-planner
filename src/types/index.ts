export type PermissionRef = {
  label: string;
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

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

const HTTP_METHODS: ReadonlySet<string> = new Set<HttpMethod>(["GET", "POST", "PUT", "DELETE", "PATCH"]);

export function isHttpMethod(value: string): value is HttpMethod {
  return HTTP_METHODS.has(value);
}

export type Endpoint = {
  method: HttpMethod;
  path: string;
  category: string;
  permissions: EndpointPermission[];
  notes?: string;
};

export type SingleAggregated = {
  kind: "single";
  symbol: string;
  label: string;
  requiredBy: string[];
  optional: boolean;
  notes: string[];
};

export type AnyOfAggregated = {
  kind: "anyOf";
  options: Array<{ symbol: string; label: string }>;
  requiredBy: string[];
  optional: boolean;
  notes: string[];
};

export type AggregatedPermission = SingleAggregated | AnyOfAggregated;

export function endpointId(e: Endpoint): string {
  return `${e.method} ${e.path}`;
}
