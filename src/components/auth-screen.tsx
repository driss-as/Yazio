import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/auth-context';
import { MaxContentWidth, Radii, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Mode = 'sign-in' | 'sign-up';

export function AuthScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const isSignUp = mode === 'sign-up';

  async function handleSubmit() {
    if (!email || !password) {
      setError('Enter your email and password.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setInfo(null);

    const { error: authError } = isSignUp ? await signUp(email, password) : await signIn(email, password);

    setSubmitting(false);

    if (authError) {
      setError(authError);
      return;
    }

    if (isSignUp) {
      setInfo('Check your inbox to confirm your email.');
    }
  }

  function toggleMode() {
    setMode(isSignUp ? 'sign-in' : 'sign-up');
    setError(null);
    setInfo(null);
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.background }]}
      behavior={Platform.select({ ios: 'padding', default: undefined })}>
      <View style={[styles.page, { paddingTop: insets.top + Spacing.six, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <ThemedText type="displayLg">yazio</ThemedText>
          <ThemedText type="bodyMd" themeColor="textSecondary">
            {isSignUp ? 'Create an account to get started.' : 'Sign in to continue.'}
          </ThemedText>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.outlineVariant },
            Shadows.soft,
          ]}>
          <View style={styles.field}>
            <ThemedText type="labelLg" themeColor="textSecondary">
              Email
            </ThemedText>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={theme.outline}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              style={[
                styles.input,
                { color: theme.text, borderColor: theme.outlineVariant, backgroundColor: theme.backgroundElement },
              ]}
            />
          </View>

          <View style={styles.field}>
            <ThemedText type="labelLg" themeColor="textSecondary">
              Password
            </ThemedText>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={theme.outline}
              autoCapitalize="none"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              textContentType={isSignUp ? 'newPassword' : 'password'}
              secureTextEntry
              style={[
                styles.input,
                { color: theme.text, borderColor: theme.outlineVariant, backgroundColor: theme.backgroundElement },
              ]}
            />
          </View>

          {error ? (
            <ThemedText type="bodyMd" themeColor="error">
              {error}
            </ThemedText>
          ) : null}

          {info ? (
            <ThemedText type="bodyMd" themeColor="textSecondary">
              {info}
            </ThemedText>
          ) : null}

          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            style={({ pressed }) => [
              styles.submitButton,
              { backgroundColor: theme.primary },
              (pressed || submitting) && styles.pressed,
            ]}>
            {submitting ? (
              <ActivityIndicator color={theme.onPrimary} />
            ) : (
              <ThemedText type="labelLg" style={{ color: theme.onPrimary }}>
                {isSignUp ? 'Create account' : 'Sign in'}
              </ThemedText>
            )}
          </Pressable>
        </View>

        <Pressable onPress={toggleMode} style={styles.toggle}>
          <ThemedText type="bodyMd" themeColor="textSecondary">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <ThemedText type="bodyMd" themeColor="primary">
              {isSignUp ? 'Sign in' : 'Sign up'}
            </ThemedText>
          </ThemedText>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  page: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    justifyContent: 'center',
    gap: Spacing.five,
  },
  header: {
    gap: Spacing.two,
  },
  card: {
    borderRadius: Radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.four,
    gap: Spacing.four,
  },
  field: {
    gap: Spacing.two,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  submitButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Radii.full,
  },
  pressed: {
    opacity: 0.8,
  },
  toggle: {
    alignItems: 'center',
  },
});
