// components/ThemedButton.tsx
import { Colors } from "@/themes/colors";
import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacityProps,
  useColorScheme,
  ViewStyle
} from "react-native";

type ThemedButtonProps = TouchableOpacityProps & {
  title: string;
  textStyle?: TextStyle;
  buttonStyle?: ViewStyle;
};

export const ThemedButton: React.FC<ThemedButtonProps> = ({
  title,
  textStyle,
  buttonStyle,
  ...props
}) => {
  const scheme = useColorScheme();
  const theme = Colors[scheme || "light"];

  return (
    <Pressable
      {...props}
      style={[styles.button, { backgroundColor: theme.primary }, buttonStyle]}
    >
      <Text style={[styles.text, { color: theme.primaryText }, textStyle]}>
        {title}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
  },
});
