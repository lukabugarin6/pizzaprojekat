// components/products/bottom-sheet-modal.tsx
import React, { ReactNode, useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetFooter,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  onClose: () => void;
  bg: string;
  border: string;

  header?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;

  snapPoints?: (string | number)[];

  nonClosable?: boolean; // default false
};

export function GorhomSheetModal({
  visible,
  onClose,
  bg,
  border,
  header,
  children,
  footer,
  snapPoints,
  nonClosable = false,
}: Props) {
  const ref = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();

  // ✅ keep latest visible to avoid stale closures
  const visibleRef = useRef<boolean>(visible);
  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  const points = useMemo<(string | number)[]>(
    () => snapPoints ?? ["100%"],
    [snapPoints],
  );

  useEffect(() => {
    if (visible) ref.current?.present();
    else ref.current?.dismiss();
  }, [visible]);

  const renderBackdrop = (props: any) => (
    <BottomSheetBackdrop
      {...props}
      appearsOnIndex={0}
      disappearsOnIndex={-1}
      pressBehavior={nonClosable ? "none" : "close"}
      opacity={0.5}
    />
  );

  const renderFooter = footer
    ? (props: any) => (
        <BottomSheetFooter {...props} bottomInset={insets.bottom}>
          <View style={[styles.footerWrap, { backgroundColor: bg }]}>
            {footer}
          </View>
        </BottomSheetFooter>
      )
    : undefined;

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={points}
      topInset={insets.top}
      backdropComponent={renderBackdrop}
      enablePanDownToClose={!nonClosable}
      onDismiss={() => {
        // ✅ only "fight" dismiss if user tried to close while we still want it open
        if (nonClosable && visibleRef.current) {
          ref.current?.present();
          return;
        }
        // when parent says visible=false, allow dismiss + notify
        onClose();
      }}
      handleIndicatorStyle={{
        backgroundColor: border,
        opacity: nonClosable ? 0.35 : 0.8,
      }}
      backgroundStyle={[styles.background, { backgroundColor: bg }]}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      footerComponent={renderFooter}
    >
      <View style={[styles.topBorder, { backgroundColor: border }]} />
      {header ? <View style={styles.headerWrap}>{header}</View> : null}

      <BottomSheetScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  background: { borderRadius: 0 },
  topBorder: { height: 1, width: "100%" },

  headerWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 80,
  },

  footerWrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
});
