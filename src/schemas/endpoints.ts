import { z } from "zod";

const PermissionRefSchema = z.object({
  label: z.string(),
});

const SinglePermissionSchema = z.object({
  symbol: z.string(),
  required: z.boolean().optional(),
  note: z.string().optional(),
});

const AnyOfPermissionSchema = z.object({
  anyOf: z.array(z.string()).min(2),
  required: z.boolean().optional(),
  note: z.string().optional(),
});

const EndpointPermissionSchema = z.union([AnyOfPermissionSchema, SinglePermissionSchema]);

const EndpointSchema = z.object({
  method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]),
  path: z.string().startsWith("/"),
  category: z.string().min(1),
  permissions: z.array(EndpointPermissionSchema),
  notes: z.string().optional(),
});

export const EndpointsDataSchema = z.object({
  version: z.string(),
  permissions: z.record(z.string(), PermissionRefSchema),
  endpoints: z.array(EndpointSchema),
});

export type EndpointsData = z.infer<typeof EndpointsDataSchema>;
