/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { RouteRecordRaw } from "vue-router";
import EntitySchema from "../base/EntitySchema";

const getEntityRoutes = (entityName: string, requiredRole: string) => ({
  path: `/${entityName}`,

  component: () => import("layouts/MainLayout.vue"),

  meta: { role: requiredRole },

  children: [
    {
      path: "",
      component: () => import("src/domain/qikflow/ui/EntityList.vue"),
      props: { entity_type: entityName },
    },
    {
      path: "edit/:id",
      component: () => import("src/domain/qikflow/ui/EntityEdit.vue"),
      props: (route: any) => {
        const props = {
          context: {
            entity_type: entityName,
            entity_id: route.params.id as string,
            real_time: true,
          },
        };

        return props;
      },
    },
  ],
});

// Todo the member role is hard code and should be defined elsewhere
export default function getDomainRoutes(): RouteRecordRaw[] {
  const routes: RouteRecordRaw[] = [];

  EntitySchema.Schemas.map((s: EntitySchema) => {
    routes.push(getEntityRoutes(s.EntityType, "tenant_admin"));
  });

  return routes;
}
