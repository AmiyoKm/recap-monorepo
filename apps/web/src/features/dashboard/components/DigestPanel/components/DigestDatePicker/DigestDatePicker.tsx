import { CalendarIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DIGEST_DATE_LABEL_FORMAT,
  DIGEST_DATE_PICKER_LABEL,
} from "@/features/dashboard/components/DigestPanel/components/DigestDatePicker/DigestDatePicker.constants";
import {
  isDigestDateDisabled,
  toDigestDate,
} from "@/features/dashboard/components/DigestPanel/components/DigestDatePicker/DigestDatePicker.helpers";
import type { IDigestDatePickerProps } from "@/features/dashboard/components/DigestPanel/components/DigestDatePicker/DigestDatePicker.interfaces";
import { dayjs } from "@/shared/date/date.helpers";

export function DigestDatePicker({ date, dates, onSelect }: IDigestDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = dayjs(date).toDate();

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" aria-label={DIGEST_DATE_PICKER_LABEL}>
          <CalendarIcon />
          {dayjs(date).format(DIGEST_DATE_LABEL_FORMAT)}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0">
        <Calendar
          mode="single"
          required
          selected={selected}
          defaultMonth={selected}
          disabled={(day) => isDigestDateDisabled(dates, day)}
          onSelect={(day) => {
            onSelect(toDigestDate(day));
            setIsOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
