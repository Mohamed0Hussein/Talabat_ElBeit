import { Colors } from "@/themes/colors";
import React from "react";
import { useColorScheme, View, ViewProps } from "react-native";

type ThemedViewProps = ViewProps & {
  surface?: boolean;
};

export const ThemedView: React.FC<ThemedViewProps> = ({
  style,
  surface,
  ...props
}) => {
  const scheme = useColorScheme();
  const theme = Colors[scheme || "light"];

  return (
    <View
      {...props}
      style={[
        style,
      ]}
    />
  );
};
