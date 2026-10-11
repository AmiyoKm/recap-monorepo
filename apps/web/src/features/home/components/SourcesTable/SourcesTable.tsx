import { providerLabel } from "@/api/identity/identity.helpers";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Section } from "@/features/app-shell/components/Section";
import { SectionHeader } from "@/features/app-shell/components/SectionHeader";
import {
  SOURCES_AVAILABILITY_LABELS,
  SOURCES_BODY,
  SOURCES_HEAD_METHOD,
  SOURCES_HEAD_SOURCE,
  SOURCES_HEAD_STATUS,
  SOURCES_ROWS,
  SOURCES_TITLE,
} from "@/features/home/components/SourcesTable/SourcesTable.constants";
import { ESourceAvailability } from "@/features/home/home.enums";

export function SourcesTable() {
  return (
    <Section
      className="pt-0 sm:pt-0 lg:pt-0"
      innerClassName="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12"
    >
      <div className="lg:col-span-5">
        <SectionHeader title={SOURCES_TITLE} description={SOURCES_BODY} />
      </div>
      <div className="min-w-0 lg:col-span-7">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{SOURCES_HEAD_SOURCE}</TableHead>
              <TableHead className="hidden sm:table-cell">{SOURCES_HEAD_METHOD}</TableHead>
              <TableHead className="text-right">{SOURCES_HEAD_STATUS}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {SOURCES_ROWS.map((row) => {
              const isAvailable = row.availability === ESourceAvailability.AVAILABLE;
              return (
                <TableRow key={row.provider}>
                  <TableCell className="font-medium">{providerLabel(row.provider)}</TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {row.method}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={isAvailable ? "secondary" : "outline"}>
                      {SOURCES_AVAILABILITY_LABELS[row.availability]}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Section>
  );
}
