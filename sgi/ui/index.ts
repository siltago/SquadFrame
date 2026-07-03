/* SquadUI — Design System exports */

/* ── Icons ────────────────────────────────────────────── */
export * from "./icons";

/* ── Theme ────────────────────────────────────────────── */
export { ThemeProvider, useTheme } from "./theme/ThemeProvider";
export { ThemeScript }             from "./theme/ThemeScript";
export type { Theme }              from "./theme/tokens";
export { MOTION, RADIUS, TYPE_SCALE } from "./theme/tokens";

/* ── Lib ──────────────────────────────────────────────── */
export { cn } from "./lib/cn";

/* ── Form primitives ──────────────────────────────────── */
export { Button }            from "./components/Button";
export type { ButtonVariant, ButtonSize } from "./components/Button";

export { Input, Textarea }   from "./components/Input";
export { Select }            from "./components/Select";

export { Checkbox, CheckboxGroup }  from "./components/Checkbox";
export { Radio, RadioGroup }        from "./components/Radio";
export { Switch }                   from "./components/Switch";

export { Form, FormField, FormLabel, FormControl, FormMessage, FormHint } from "./components/FormField";

/* ── Data display ─────────────────────────────────────── */
export { Card, CardHeader, CardTitle, CardDescription, CardFooter, StatCard } from "./components/Card";

export { Badge, ColorBadge }        from "./components/Badge";
export type { BadgeVariant }        from "./components/Badge";

export { Chip }                     from "./components/Chip";
export type { ChipVariant }         from "./components/Chip";

export { Avatar, AvatarGroup }      from "./components/Avatar";
export { Progress }                 from "./components/Progress";

export { DataTable, Th, Td, Tr }   from "./components/Table";
export type { Column }             from "./components/Table";

export { Pagination }              from "./components/Pagination";

/* ── Feedback ─────────────────────────────────────────── */
export { Skeleton, SkeletonText, SkeletonCard, SkeletonTable } from "./components/Skeleton";
export { EmptyState, EmptyIcons }  from "./components/EmptyState";
export { Spinner, LoadingOverlay, LoadingBar } from "./components/Spinner";
export { Alert }                   from "./components/Alert";
export type { AlertVariant }       from "./components/Alert";

/* ── Overlay & navigation ─────────────────────────────── */
export { Modal, ConfirmDialog }    from "./components/Modal";
export { Drawer }                  from "./components/Drawer";
export type { DrawerSide }         from "./components/Drawer";

export { Tooltip }                 from "./components/Tooltip";

export { Dropdown, DropdownItem, DropdownSeparator, DropdownLabel } from "./components/Dropdown";

export { Tabs, TabList, Tab, TabPanel } from "./components/Tabs";

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "./components/Accordion";

/* ── Navigation ──────────────────────────────────────── */
export { Breadcrumb }              from "./components/Breadcrumb";
export type { BreadcrumbItem }     from "./components/Breadcrumb";

/* ── Page structure ───────────────────────────────────── */
export { PageHeader, Section, Container } from "./components/PageHeader";

/* ── Kanban ──────────────────────────────────────────── */
export { BoardCard }               from "./components/kanban/BoardCard";
export { CardMenu }                from "./components/kanban/CardMenu";
export type { CardMenuItem }       from "./components/kanban/CardMenu";
export { CardSkeleton, CardSkeletonList } from "./components/kanban/CardSkeleton";
export { ColumnHeader }            from "./components/kanban/ColumnHeader";
export { DragHandle }              from "./components/kanban/DragHandle";
export { PipelineStepper }         from "./components/kanban/PipelineStepper";
export type { PipelineStep }       from "./components/kanban/PipelineStepper";
export { PriorityIndicator }       from "./components/kanban/PriorityIndicator";
export type { PriorityLevel }      from "./components/kanban/PriorityIndicator";

/* ── Layout ──────────────────────────────────────────── */
export { AppHeader }               from "./layout/AppHeader";
export type { NavItem }            from "./layout/AppHeader";

export { AppSidebar }              from "./layout/AppSidebar";
export type { SidebarNavItem, SidebarSection } from "./layout/AppSidebar";

export { DashboardLayout, DashboardContent } from "./layouts/DashboardLayout";
export { CrudLayout }              from "./layouts/CrudLayout";
export { AuthLayout }              from "./layouts/AuthLayout";
