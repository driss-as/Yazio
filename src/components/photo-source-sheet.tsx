import BottomSheet, {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import * as ImagePicker from 'expo-image-picker';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type PhotoSourceSheetRef = {
  present: () => void;
  dismiss: () => void;
};

type PhotoSourceSheetProps = {
  onPhotoSelected: (uri: string) => Promise<void>;
};

export const PhotoSourceSheet = forwardRef<PhotoSourceSheetRef, PhotoSourceSheetProps>(
  function PhotoSourceSheet({ onPhotoSelected }, ref) {
    const theme = useTheme();
    const sheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ['30%'], []);
    const [uploading, setUploading] = useState(false);

    useImperativeHandle(ref, () => ({
      present: () => sheetRef.current?.expand(),
      dismiss: () => sheetRef.current?.close(),
    }));

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
      ),
      []
    );

    async function handlePicked(uri: string) {
      setUploading(true);
      try {
        await onPhotoSelected(uri);
        sheetRef.current?.close();
      } catch (error) {
        Alert.alert('Upload failed', error instanceof Error ? error.message : 'Could not save photo.');
      } finally {
        setUploading(false);
      }
    }

    async function handleTakePhoto() {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Camera access needed', 'Enable camera access in settings to take a photo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 0.8 });
      if (!result.canceled && result.assets?.[0]) {
        await handlePicked(result.assets[0].uri);
      }
    }

    async function handlePickPhoto() {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Photo access needed', 'Enable photo library access in settings to import a photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.8 });
      if (!result.canceled && result.assets?.[0]) {
        await handlePicked(result.assets[0].uri);
      }
    }

    return (
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme.surfaceContainerLowest }}
        handleIndicatorStyle={{ backgroundColor: theme.outlineVariant }}>
        <BottomSheetView style={styles.content}>
          <ThemedText type="headlineMd" style={styles.title}>
            Add a meal photo
          </ThemedText>

          {uploading ? (
            <View style={styles.uploadingRow}>
              <ActivityIndicator color={theme.primary} />
              <ThemedText type="bodyMd" themeColor="textSecondary">
                Saving photo…
              </ThemedText>
            </View>
          ) : (
            <>
              <SourceRow
                icon={{ ios: 'camera', android: 'photo_camera', web: 'photo_camera' }}
                label="Take photo"
                onPress={handleTakePhoto}
              />
              <SourceRow
                icon={{ ios: 'photo', android: 'photo_library', web: 'photo_library' }}
                label="Choose from library"
                onPress={handlePickPhoto}
              />
            </>
          )}
        </BottomSheetView>
      </BottomSheet>
    );
  }
);

function SourceRow({
  icon,
  label,
  onPress,
}: {
  icon: SymbolViewProps['name'];
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.backgroundElement },
        pressed && styles.pressed,
      ]}>
      <View style={[styles.rowIcon, { backgroundColor: theme.surfaceContainerLowest }]}>
        <SymbolView name={icon} size={20} tintColor={theme.text} />
      </View>
      <ThemedText type="bodyLg">{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  title: {
    marginBottom: Spacing.one,
  },
  uploadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.five,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radii.lg,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
