import React from "react";
import { Text, TextProps, useColorScheme } from "react-native";
import { Colors } from "../themes/colors";

export function ThemedText({ style, ...props }: TextProps) {
  const scheme = useColorScheme();
  const theme = Colors[scheme || "light"];
  return <Text style={[{ color: theme.text }, style]} {...props} />;
}
