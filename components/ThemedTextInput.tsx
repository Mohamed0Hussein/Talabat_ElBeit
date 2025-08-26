// components/ThemedTextInput.tsx
import { Colors } from "@/themes/colors";
import React from "react";
import { StyleSheet, TextInput, TextInputProps, useColorScheme } from "react-native";

export const ThemedTextInput: React.FC<TextInputProps> = ({
  style,
  ...props
}) => {
  const scheme = useColorScheme();
  const theme = Colors[scheme || "light"];

  return (
    <TextInput
      {...props}
      placeholderTextColor={theme.placeholder}
      style={[
        styles.input,
        {
          color: theme.text,
          backgroundColor: theme.inputBackground,
          borderColor: theme.inputBorder,
        },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginBottom: 12,
  },
});
