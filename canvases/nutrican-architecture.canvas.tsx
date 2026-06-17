import { useState } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  computeDAGLayout,
  Grid,
  H1,
  H2,
  Link,
  Row,
  Stack,
  Stat,
  Text,
  useHostTheme,
} from "cursor/canvas";

type Node = { id: string; label: string; type: "layer" | "module" | "frontend" | "infra"; };
type Edge = { from: string; to: string; label?: string };

const theme = useHostTheme();

const frontend: Node[] = [
  { id: "app", label: "React App", type: "frontend" },
  { id: "router", label: "Router", type: "frontend" },
  { id: "pages", label: "Pages / Views", type: "frontend" },
  { id: "sse", label: "SSE Hook", type: "frontend" },
  { id: "store", label: "Zustand Store", type: "frontend" },
  { id: "api", label: "Axios Client", type: "frontend" },
];

const backend: Node[] = [
  { id: "gateway", label: "Spring Boot Gateway", type: "module" },
  { id: "auth", label: "Auth Module", type: "module" },
  { id: "core", label: "Core Module", type: "module" },
  { id: "diet", label: "Diet Tracker", type: "module" },
  { id: "ai", label: "AI Gateway", type: "module" },
  { id: "workspace", label: "PT Workspace", type: "module" },
  { id: "kyc", label: "KYC Module", type: "module" },
  { id: "admin", label: "Admin Module", type: "module" },
  { id: "userprofile", label: "User Profile", type: "module" },
];

const infra: Node[] = [
  { id: "db", label: "PostgreSQL", type: "infra" },
  { id: "minio", label: "MinIO", type: "infra" },
  { id: "sse-infra", label: "SSE Stream", type: "infra" },
  { id: "swagger", label: "Swagger / OpenAPI", type: "infra" },
];

const allNodes: Node[] = [
  ...frontend.map((n) => ({ ...n, type: "frontend" as const })),
  ...backend.map((n) => ({ ...n, type: "module" as const })),
  ...infra.map((n) => ({ ...n, type: "infra" as const })),
];

const allEdges: Edge[] = [
  { from: "app", to: "router" },
  { from: "router", to: "pages" },
  { from: "pages", to: "store" },
  { from: "pages", to: "sse" },
  { from: "pages", to: "api" },
  { from: "sse", to: "workspace" },
  { from: "api", to: "gateway" },
  { from: "gateway", to: "auth", label: "JWT" },
  { from: "gateway", to: "core", label: "shared" },
  { from: "gateway", to: "diet" },
  { from: "gateway", to: "ai" },
  { from: "gateway", to: "workspace" },
  { from: "gateway", to: "kyc" },
  { from: "gateway", to: "admin" },
  { from: "gateway", to: "userprofile" },
  { from: "auth", to: "core" },
  { from: "diet", to: "core" },
  { from: "workspace", to: "core" },
  { from: "kyc", to: "core" },
  { from: "admin", to: "core" },
  { from: "userprofile", to: "core" },
  { from: "core", to: "db" },
  { from: "kyc", to: "minio" },
  { from: "userprofile", to: "minio" },
  { from: "workspace", to: "sse-infra" },
  { from: "gateway", to: "swagger" },
];

const layout = computeDAGLayout({
  nodes: allNodes,
  edges: allEdges,
  direction: "vertical",
  nodeWidth: 180,
  nodeHeight: 36,
  rankGap: 72,
  nodeGap: 24,
  padding: 32,
});

const nodeById = new Map(layout.nodes.map((n) => [n.id, n]));

const scale = 1;

const categoryColor: Record<string, string> = {
  frontend: theme?.accent ?? "#6366f1",
  module: "#10b981",
  infra: "#f59e0b",
};

export default function NutricanArchitecture() {
  const [activeLayer, setActiveLayer] = useState<string | null>(null);

  const filteredEdges =
    activeLayer === null
      ? allEdges
      : allEdges.filter((e) => {
          const fromNode = nodeById.get(e.from);
          const toNode = nodeById.get(e.to);
          if (!fromNode || !toNode) return false;
          const fromType = allNodes.find((n) => n.id === e.from)?.type;
          const toType = allNodes.find((n) => n.id === e.to)?.type;
          if (activeLayer === "frontend") return fromType === "frontend" || toType === "frontend";
          if (activeLayer === "backend") return fromType === "module" || toType === "module";
          if (activeLayer === "infra") return fromType === "infra" || toNode.type === "infra";
          return true;
        });

  return (
    <Stack gap={24} style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <Stack gap={8}>
        <H1>Nutrican Architecture</H1>
        <Text tone="secondary">
          Full-stack nutrition tracking platform — backend modules, frontend flows, and runtime integrations.
        </Text>
        <Row gap={8} align="center" style={{ marginTop: 4 }}>
          <Text size="small" tone="tertiary">
            Source:{" "}
            <Link href="file:///c:/Users/ad/OneDrive/Desktop/swd/nutrican">
              c:/Users/ad/OneDrive/Desktop/swd/nutrican
            </Link>
          </Text>
        </Row>
      </Stack>

      <Row gap={8} wrap>
        <Pill active={activeLayer === null} onClick={() => setActiveLayer(null)}>
          All layers
        </Pill>
        <Pill
          active={activeLayer === "frontend"}
          onClick={() => setActiveLayer("frontend")}
          tone="info"
        >
          Frontend
        </Pill>
        <Pill
          active={activeLayer === "backend"}
          onClick={() => setActiveLayer("backend")}
          tone="success"
        >
          Backend
        </Pill>
        <Pill
          active={activeLayer === "infra"}
          onClick={() => setActiveLayer("infra")}
          tone="warning"
        >
          Infrastructure
        </Pill>
      </Row>

      <Card variant="borderless" size="lg">
        <CardHeader>System overview</CardHeader>
        <CardBody>
          <Grid columns={4} gap={16} style={{ marginBottom: 24 }}>
            <Stat value="10" label="Java controllers" tone="info" />
            <Stat value="7" label="Backend modules" tone="success" />
            <Stat value="1" label="React SPA" tone="danger" />
            <Stat value="4" label="Infra services" tone="warning" />
          </Grid>

          <div
            style={{
              position: "relative",
              width: layout.width * scale,
              height: layout.height * scale,
              margin: "0 auto",
              border: `1px solid ${theme?.stroke?.tertiary ?? "#e5e7eb"}`,
              borderRadius: 12,
              background: theme?.surface?.base ?? "#ffffff",
            }}
          >
            {layout.ranks.map((rank) => (
              <div
                key={rank.rank}
                style={{
                  position: "absolute",
                  left: rank.x,
                  top: rank.y,
                  width: rank.width,
                  height: rank.height,
                  borderRadius: 8,
                  background: theme?.surface?.muted ?? "#f9fafb",
                  border: `1px dashed ${theme?.stroke?.tertiary ?? "#e5e7eb"}`,
                  opacity: activeLayer === null || activeLayer === "all" ? 1 : 0.35,
                }}
              />
            ))}

            {filteredEdges.map((edge, idx) => {
              const from = nodeById.get(edge.from)!;
              const to = nodeById.get(edge.to)!;
              const sourceX = from.x + 90;
              const sourceY = from.y + 18;
              const targetX = to.x + 90;
              const targetY = to.y + 18;
              const midY = (sourceY + targetY) / 2;

              const path = `M ${sourceX} ${sourceY} C ${sourceX} ${midY}, ${targetX} ${midY}, ${targetX} ${targetY}`;

              return (
                <svg
                  key={`${edge.from}-${edge.to}-${idx}`}
                  width={layout.width * scale}
                  height={layout.height * scale}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    pointerEvents: "none",
                  }}
                >
                  <path
                    d={path}
                    fill="none"
                    stroke={theme?.stroke?.tertiary ?? "#cbd5e1"}
                    strokeWidth={1.5}
                    strokeDasharray={edge.label ? "none" : "4 4"}
                  />
                  {edge.label && (
                    <text
                      x={(sourceX + targetX) / 2 + 4}
                      y={midY - 2}
                      style={{
                        fontSize: 10,
                        fill: theme?.text?.tertiary ?? "#64748b",
                        fontFamily: "sans-serif",
                      }}
                    >
                      {edge.label}
                    </text>
                  )}
                </svg>
              );
            })}

            {allNodes
              .filter((n) => {
                if (activeLayer === null) return true;
                if (activeLayer === "frontend") return n.type === "frontend";
                if (activeLayer === "backend") return n.type === "module";
                if (activeLayer === "infra") return n.type === "infra";
                return true;
              })
              .map((node) => {
                const pos = nodeById.get(node.id)!;
                return (
                  <div
                    key={node.id}
                    style={{
                      position: "absolute",
                      left: pos.x,
                      top: pos.y,
                      width: 180,
                      height: 36,
                      borderRadius: 8,
                      background: theme?.surface?.elevated ?? "#ffffff",
                      border: `1px solid ${categoryColor[node.type] ?? theme?.stroke?.primary ?? "#e2e8f0"}`,
                      boxShadow: theme?.shadow?.sm ?? "0 1px 2px rgba(0,0,0,0.05)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      color: theme?.text?.primary ?? "#0f172a",
                      opacity: activeLayer === null ? 1 : 0.95,
                      cursor: "default",
                      padding: "0 8px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: categoryColor[node.type],
                        flexShrink: 0,
                      }}
                    />
                    {node.label}
                  </div>
                );
              })}
          </div>

          <Stack gap={12} style={{ marginTop: 24 }}>
            <H2>Module map</H2>
            <Grid columns={3} gap={16}>
              <Card>
                <CardHeader trailing={<Pill active>frontend</Pill>}>Frontend</CardHeader>
                <CardBody>
                  <Stack gap={6}>
                    <Text size="small">React 19 + Vite</Text>
                    <Text size="small">React Router 7</Text>
                    <Text size="small">Axios interceptors</Text>
                    <Text size="small">Zustand + localStorage</Text>
                    <Text size="small">Sonner toasts</Text>
                  </Stack>
                </CardBody>
              </Card>

              <Card>
                <CardHeader trailing={<Pill active tone="success">backend</Pill>}>
                  Backend modules
                </CardHeader>
                <CardBody>
                  <Stack gap={4}>
                    {backend.map((m) => (
                      <Row key={m.id} gap={8} align="center">
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: categoryColor.module,
                          }}
                        />
                        <Text size="small">{m.label}</Text>
                      </Row>
                    ))}
                  </Stack>
                </CardBody>
              </Card>

              <Card>
                <CardHeader trailing={<Pill active tone="warning">infra</Pill>}>
                  Infrastructure
                </CardHeader>
                <CardBody>
                  <Stack gap={6}>
                    <Text size="small">Spring Security + JWT</Text>
                    <Text size="small">Spring Data JPA</Text>
                    <Text size="small">SSE / SseEmitter</Text>
                    <Text size="small">MinIO object storage</Text>
                    <Text size="small">Swagger / OpenAPI</Text>
                  </Stack>
                </CardBody>
              </Card>
            </Grid>
          </Stack>

          <Stack gap={12} style={{ marginTop: 24 }}>
            <H2>Data flows</H2>
            <Row gap={16} wrap>
              <Card>
                <CardHeader>Auth flow</CardHeader>
                <CardBody>
                  <Text size="small">
                    Client requests login → AuthController → JWT issued → stored in Zustand →
                    Axios attaches Bearer token → JwtAuthenticationFilter validates on each request.
                  </Text>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>SSE flow</CardHeader>
                <CardBody>
                  <Text size="small">
                    PT opens workspace → useSSE hook connects → PtWorkspaceController streams
                    SseEmitter → UI receives real-time events without polling.
                  </Text>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>KYC / AI flow</CardHeader>
                <CardBody>
                  <Text size="small">
                    Customer uploads documents → KYC orchestrator stores in MinIO → AI analyzes →
                    results saved and surfaced in admin and customer pages.
                  </Text>
                </CardBody>
              </Card>
            </Row>
          </Stack>
        </CardBody>
      </Card>
    </Stack>
  );
}
