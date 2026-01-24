import { Platform, StyleSheet } from "react-native";

export const productsStyles = StyleSheet.create({
  fieldLabel: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  safe: { flex: 1, paddingTop: 60 },
  container: { flex: 1, padding: 16, paddingTop: 24 },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  title: { fontSize: 24, fontWeight: "800", flex: 1 },

  inputWrap: {
    borderWidth: 1,
    borderRadius: 0,
    justifyContent: "center",
    marginBottom: 10,
  },
  input: {
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    fontSize: 16,
  },

  iconBtnNoBorder: {
    width: 40,
    height: 40,
    borderRadius: 0,
    alignItems: "center",
    justifyContent: "center",
  },

  fullBtn: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 0,
    borderWidth: 1,
    height: 46,
    width: "100%",
  },

  fab: {
    position: "absolute",
    right: 18,
    bottom: 18,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  modalTitle: { fontSize: 18, fontWeight: "800" },

  modalActions: { flexDirection: "row", gap: 10, marginTop: 6 },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 0,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 46,
  },
  cancelText: { fontWeight: "800" },
  saveText: { fontWeight: "800" },
  sheetRoot: { flex: 1 },
  sheetInner: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
});
