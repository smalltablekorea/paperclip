import { Link } from "@/lib/router";
import { AgentIcon } from "./AgentIconPicker";
import { timeAgo } from "../lib/timeAgo";
import { cn } from "../lib/utils";
import type { ActivityEvent, Agent } from "@paperclipai/shared";
import { issueStatusIcon, issueStatusIconDefault } from "../lib/status-colors";
import {
  FileText,
  UserPlus,
  Loader2,
  Bot,
  User,
  Settings,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function actionLabel(action: string, details?: Record<string, unknown> | null): string {
  switch (action) {
    case "issue.created":
      return "created a task";
    case "issue.document_created":
      return "created a document";
    case "issue.document_updated":
      return "updated a document";
    case "issue.updated": {
      const status = details?.status as string | undefined;
      if (status === "in_review") return "submitted for review";
      return "updated task";
    }
    case "approval.created":
      return "submitted for approval";
    case "approval.approved":
      return "approved";
    case "approval.rejected":
      return "requested changes";
    case "agent.created":
      return "new agent created";
    default:
      return action.replace(/[._]/g, " ");
  }
}

/** Map action → task status for the status circle indicator */
function deriveTaskStatus(action: string, details?: Record<string, unknown> | null): string | null {
  switch (action) {
    case "issue.created":
      return "todo";
    case "issue.updated": {
      const status = details?.status as string | undefined;
      return status ?? null;
    }
    case "issue.document_created":
    case "issue.document_updated":
      return "in_progress";
    case "approval.created":
      return "in_review";
    case "approval.approved":
      return "done";
    case "approval.rejected":
      return "blocked";
    default:
      return null;
  }
}

function borderColorForStatus(status: string | null): string {
  switch (status) {
    case "todo": return "border-l-blue-500/50";
    case "in_progress": return "border-l-yellow-500/50";
    case "in_review": return "border-l-violet-500/50";
    case "done": return "border-l-green-500/50";
    case "blocked": return "border-l-red-500/50";
    default: return "border-l-border";
  }
}

function statusChip(action: string, details?: Record<string, unknown> | null) {
  switch (action) {
    case "issue.created":
      return { label: "New Task", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" };
    case "issue.updated": {
      const status = (details as Record<string, unknown> | null)?.status;
      if (status === "in_review")
        return { label: "For Review", className: "bg-violet-500/10 text-violet-600 dark:text-violet-400" };
      return null;
    }
    case "approval.created":
      return { label: "For Review", className: "bg-violet-500/10 text-violet-600 dark:text-violet-400" };
    case "approval.approved":
      return { label: "Approved", className: "bg-green-500/10 text-green-600 dark:text-green-400" };
    case "approval.rejected":
      return { label: "Changes Requested", className: "bg-red-500/10 text-red-600 dark:text-red-400" };
    case "issue.document_created":
    case "issue.document_updated":
      return { label: "Document", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" };
    case "agent.created":
      return { label: "New Hire", className: "bg-purple-500/10 text-purple-600 dark:text-purple-400" };
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Status Circle — matches StatusIcon rendering                       */
/* ------------------------------------------------------------------ */

function StatusCircle({ status, className }: { status: string; className?: string }) {
  const colorClass = issueStatusIcon[status] ?? issueStatusIconDefault;
  return (
    <span className={cn("relative inline-flex h-4 w-4 rounded-full border-2 shrink-0", colorClass, className)}>
      {status === "done" && (
        <span className="absolute inset-0 m-auto h-2 w-2 rounded-full bg-current" />
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Actor Icon                                                         */
/* ------------------------------------------------------------------ */

function ActorIcon({ event, agentMap }: { event: ActivityEvent; agentMap: Map<string, Agent> }) {
  if (event.actorType === "agent") {
    const agent = agentMap.get(event.actorId);
    return <AgentIcon icon={agent?.icon ?? null} className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />;
  }
  if (event.actorType === "user") {
    return <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />;
  }
  return <Settings className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface FeedCardProps {
  event: ActivityEvent;
  agentMap: Map<string, Agent>;
  entityNameMap: Map<string, string>;
  entityTitleMap?: Map<string, string>;
  isActive?: boolean;
  className?: string;
}

export function FeedCard({
  event,
  agentMap,
  entityNameMap,
  entityTitleMap,
  isActive,
  className,
}: FeedCardProps) {
  const actor = event.actorType === "agent" ? agentMap.get(event.actorId) : null;
  const actorName = actor?.name
    ?? (event.actorType === "system" ? "System"
      : event.actorType === "user" ? "Board"
      : event.actorId || "Unknown");

  const entityName = entityNameMap.get(`${event.entityType}:${event.entityId}`);
  const entityTitle = entityTitleMap?.get(`${event.entityType}:${event.entityId}`);
  const details = event.details as Record<string, unknown> | null;
  const docKey = details?.key as string | undefined;
  const summary = details?.summary as string | undefined;

  const taskStatus = deriveTaskStatus(event.action, details);
  const isAgentEvent = event.action === "agent.created";
  const chip = statusChip(event.action, details);
  const borderColor = isAgentEvent ? "border-l-purple-500/50" : borderColorForStatus(taskStatus);

  // Determine the display title
  const title = isAgentEvent
    ? (details?.name as string | undefined) ?? entityName ?? event.entityId
    : docKey ?? entityTitle ?? entityName ?? event.entityId;

  // Link to permanent home
  const link = event.entityType === "issue"
    ? `/issues/${entityName ?? event.entityId}`
    : event.entityType === "agent"
      ? `/agents/${event.entityId}`
      : null;

  // Status indicator for the body row
  const renderStatusIndicator = () => {
    if (isActive) {
      return <Loader2 className="h-4 w-4 shrink-0 text-amber-500 animate-spin" />;
    }
    if (isAgentEvent) {
      return <UserPlus className="h-4 w-4 shrink-0 text-purple-500" />;
    }
    if (event.action === "issue.document_created" || event.action === "issue.document_updated") {
      return <FileText className="h-4 w-4 shrink-0 text-blue-500" />;
    }
    if (taskStatus) {
      return <StatusCircle status={taskStatus} />;
    }
    return <StatusCircle status="backlog" />;
  };

  const card = (
    <div
      className={cn(
        "mx-3 my-2 rounded-lg border border-l-[3px] bg-card p-3 text-sm transition-all",
        borderColor,
        link && "cursor-pointer hover:bg-accent/50 hover:shadow-sm",
        className,
      )}
    >
      {/* Top: actor icon + name + action + timestamp */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <ActorIcon event={event} agentMap={agentMap} />
          <span className="text-xs font-medium truncate">{actorName}</span>
          <span className="text-muted-foreground truncate text-xs">
            {actionLabel(event.action, details)}
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground shrink-0">
          {timeAgo(event.createdAt)}
        </span>
      </div>

      {/* Body: status indicator + title + chip */}
      <div className="flex items-center gap-2">
        {renderStatusIndicator()}
        <span className="font-medium truncate">{title}</span>
        {chip && (
          <span
            className={cn(
              "inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium leading-tight",
              chip.className,
            )}
          >
            {chip.label}
          </span>
        )}
      </div>

      {/* Optional summary */}
      {summary && (
        <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">
          {summary}
        </p>
      )}
    </div>
  );

  if (link) {
    return (
      <Link to={link} className="no-underline text-inherit block">
        {card}
      </Link>
    );
  }

  return card;
}
