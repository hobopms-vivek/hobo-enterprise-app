import { createNavigationContainerRef } from "@react-navigation/native";

import type { AppStackParamList } from "@/navigation/types";

/** Global navigation ref so notification taps can navigate from outside React. */
export const navigationRef = createNavigationContainerRef<AppStackParamList>();
