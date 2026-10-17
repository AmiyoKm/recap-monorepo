import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TABLE_CAPTION,
  TABLE_HEAD_ACTOR,
  TABLE_HEAD_IDENTITY,
  TABLE_HEAD_KIND,
  TABLE_HEAD_SOURCE,
  TABLE_HEAD_TIME,
  TABLE_HEAD_TITLE,
  TABLE_NO_ACTOR,
} from "@/features/activity/components/ActivityTable/ActivityTable.constants";
import {
  formatActivityTime,
  kindLabel,
  sourceLabel,
} from "@/features/activity/components/ActivityTable/ActivityTable.helpers";
import type { IActivityTableProps } from "@/features/activity/components/ActivityTable/ActivityTable.interfaces";

export function ActivityTable({ rows }: IActivityTableProps) {
  return (
    <Table>
      <TableCaption className="sr-only">{TABLE_CAPTION}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>{TABLE_HEAD_TIME}</TableHead>
          <TableHead>{TABLE_HEAD_SOURCE}</TableHead>
          <TableHead className="hidden sm:table-cell">{TABLE_HEAD_IDENTITY}</TableHead>
          <TableHead className="hidden sm:table-cell">{TABLE_HEAD_KIND}</TableHead>
          <TableHead>{TABLE_HEAD_TITLE}</TableHead>
          <TableHead className="hidden sm:table-cell">{TABLE_HEAD_ACTOR}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="whitespace-nowrap text-muted-foreground">
              {formatActivityTime(row.occurredAt)}
            </TableCell>
            <TableCell>
              <Badge variant="outline">{sourceLabel(row.source)}</Badge>
            </TableCell>
            <TableCell className="hidden max-w-xs truncate sm:table-cell">
              {row.identityEmail}
            </TableCell>
            <TableCell className="hidden whitespace-nowrap sm:table-cell">
              {kindLabel(row.kind)}
            </TableCell>
            <TableCell className="w-full max-w-0 truncate">
              <a
                href={row.url}
                target="_blank"
                rel="noreferrer noopener"
                className="font-medium hover:underline"
              >
                {row.title}
              </a>
            </TableCell>
            <TableCell className="hidden max-w-xs truncate text-muted-foreground sm:table-cell">
              {row.actor ?? TABLE_NO_ACTOR}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
