import {
  ACTIVITY_EMPTY_DESCRIPTION,
  ACTIVITY_EMPTY_TITLE,
  ACTIVITY_FILTERED_EMPTY_DESCRIPTION,
  ACTIVITY_FILTERED_EMPTY_TITLE,
} from "@/features/activity/containers/ActivityContainer/ActivityContainer.constants";
import type { IActivityEmptyCopy } from "@/features/activity/containers/ActivityContainer/ActivityContainer.interfaces";

export function emptyCopy(isFiltered: boolean): IActivityEmptyCopy {
  if (isFiltered) {
    return {
      title: ACTIVITY_FILTERED_EMPTY_TITLE,
      description: ACTIVITY_FILTERED_EMPTY_DESCRIPTION,
    };
  }
  return { title: ACTIVITY_EMPTY_TITLE, description: ACTIVITY_EMPTY_DESCRIPTION };
}
