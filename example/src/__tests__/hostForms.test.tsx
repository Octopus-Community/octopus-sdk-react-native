jest.mock('react-native', () => ({
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  ScrollView: 'ScrollView',
  Text: 'Text',
  TextInput: 'TextInput',
  Switch: 'Switch',
  View: 'View',
  TouchableOpacity: 'TouchableOpacity',
  Platform: {
    select: (values: { ios?: string; default: string }) => values.default,
    OS: 'ios',
  },
  StyleSheet: { create: (styles: unknown) => styles },
}));
jest.mock('../components/PillButton', () => ({ PillButton: 'PillButton' }));
jest.mock('@react-native-vector-icons/material-icons/static', () => ({
  MaterialIcons: 'MaterialIcons',
}));

import { act, create } from 'react-test-renderer';
import type { ReactTestRenderer } from 'react-test-renderer';
import { EditProfileScreen } from '../screens/EditProfileScreen';
import { SignInScreen } from '../screens/SignInScreen';
import { HostIntegrationPanel } from '../screens/HostIntegrationPanel';
import type { HostIntegrationProps } from '../screens/HostIntegrationPanel';
import type { HostProfile } from '../auth/hostUser';

const editProps = {
  isDark: false,
  user: {
    userId: 'demo',
    profile: { username: 'Client A', biography: 'Existing bio' },
  },
  canSave: true,
  busy: false,
  error: null,
  onSave: jest.fn(),
};

it('edits all managed fields with last host values, trims them and allows clearing the bio', () => {
  const onSave = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <EditProfileScreen
        {...editProps}
        appManagedFields={['username', 'biography', 'profilePicture']}
        fieldToEdit={null}
        onSave={onSave}
      />
    );
  });
  const input = (id: string) =>
    tree.root.findByProps({ testID: `host-edit-profile-${id}` });
  const save = () => input('save');
  expect(input('nickname').props.value).toBe('Client A');
  expect(input('bio').props.value).toBe('Existing bio');
  expect(input('bio').props.multiline).toBe(true);
  expect(save().props.disabled).toBe(true);
  act(() => {
    input('nickname').props.onChangeText(' Updated name ');
    input('bio').props.onChangeText('  ');
    input('avatar').props.onChangeText(' https://example.com/new.png ');
  });
  expect(save().props.disabled).toBe(false);
  act(() => save().props.onPress());
  expect(onSave).toHaveBeenCalledWith({
    username: 'Updated name',
    biography: '',
    profilePicture: 'https://example.com/new.png',
  });
  act(() => input('nickname').props.onChangeText('  '));
  expect(save().props.disabled).toBe(true);
  act(() => save().props.onPress());
  expect(onSave).toHaveBeenCalledTimes(1);
  act(() => tree.unmount());
});

it.each([
  ['username', 'nickname', ' Changed name ', { username: 'Changed name' }],
  ['biography', 'bio', ' Changed bio ', { biography: 'Changed bio' }],
  [
    'profilePicture',
    'avatar',
    ' https://example.com/new.png ',
    { profilePicture: 'https://example.com/new.png' },
  ],
] as const)(
  'edits only the requested managed field (%s), ignoring invalid hidden fields',
  (fieldToEdit, id, value, expected) => {
    const onSave = jest.fn();
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(
        <EditProfileScreen
          {...editProps}
          user={{ userId: 'demo' }}
          appManagedFields={['username', 'biography', 'profilePicture']}
          fieldToEdit={fieldToEdit}
          onSave={onSave}
        />
      );
    });
    const inputs = tree.root.findAllByType('TextInput' as never);
    expect(inputs).toHaveLength(1);
    const input = tree.root.findByProps({ testID: `host-edit-profile-${id}` });
    expect(input.props.autoFocus).toBe(true);
    act(() => input.props.onChangeText(value));
    const save = tree.root.findByProps({ testID: 'host-edit-profile-save' });
    expect(save.props.disabled).toBe(false);
    act(() => save.props.onPress());
    expect(onSave).toHaveBeenCalledWith(expected satisfies HostProfile);
    act(() => tree.unmount());
  }
);

it.each(['username', 'biography', 'profilePicture', null] as const)(
  'keeps unmanaged fields read-only with an explanation (requested=%s)',
  (fieldToEdit) => {
    const onSave = jest.fn();
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(
        <EditProfileScreen
          {...editProps}
          appManagedFields={[]}
          fieldToEdit={fieldToEdit}
          onSave={onSave}
        />
      );
    });
    expect(tree.root.findAllByType('TextInput' as never)).toHaveLength(0);
    const text = JSON.stringify(tree.toJSON());
    expect(text).toContain(
      'is managed by the community. Edit it in the community; this screen cannot save it.'
    );
    const save = tree.root.findByProps({ testID: 'host-edit-profile-save' });
    expect(save.props.disabled).toBe(true);
    act(() => save.props.onPress());
    expect(onSave).not.toHaveBeenCalled();
    act(() => tree.unmount());
  }
);

it.each([
  { canSave: false, busy: false },
  { canSave: true, busy: true },
])(
  'prevents editing and resubmission when saving is unavailable (%j)',
  (state) => {
    const onSave = jest.fn();
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(
        <EditProfileScreen
          {...editProps}
          {...state}
          appManagedFields={['username', 'biography']}
          fieldToEdit={null}
          error="Connection refused"
          onSave={onSave}
        />
      );
    });
    for (const input of tree.root.findAllByType('TextInput' as never)) {
      expect(input.props.editable).toBe(false);
    }
    expect(
      tree.root.findByProps({ testID: 'host-edit-profile-error' }).props
        .children
    ).toBe('Connection refused');
    act(() =>
      tree.root
        .findByProps({ testID: 'host-edit-profile-save' })
        .props.onPress()
    );
    expect(onSave).not.toHaveBeenCalled();
    act(() => tree.unmount());
  }
);

const integrationProps: HostIntegrationProps = {
  displayMode: 'embed',
  onDisplayModeChange: jest.fn(),
  profileTapMode: 'sdkScreens',
  onProfileTapModeChange: jest.fn(),
  editEnabled: true,
  onEditEnabledChange: jest.fn(),
  loginEnabled: true,
  onLoginEnabledChange: jest.fn(),
  urlOpeningMode: 'sampleRule',
  onUrlOpeningModeChange: jest.fn(),
  appManagedFields: ['profilePicture'],
  busy: false,
  onRestart: jest.fn(),
};

it('stages managed fields until Restart now without changing the avatar-only default', () => {
  const onRestart = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <HostIntegrationPanel
        {...integrationProps}
        isDark={false}
        onRestart={onRestart}
      />
    );
  });
  const toggle = (field: string) =>
    tree.root.findByProps({
      testID: `host-integration-managed-${field}-switch`,
    });
  expect(toggle('username').props.value).toBe(false);
  expect(toggle('biography').props.value).toBe(false);
  expect(toggle('profilePicture').props.value).toBe(true);
  act(() => toggle('username').props.onValueChange(true));
  act(() => toggle('biography').props.onValueChange(true));
  act(() => toggle('profilePicture').props.onValueChange(false));
  expect(onRestart).not.toHaveBeenCalled();
  act(() =>
    tree.root
      .findByProps({ testID: 'host-integration-restart' })
      .props.onPress()
  );
  expect(onRestart).toHaveBeenCalledWith(['username', 'biography']);
  expect(onRestart).toHaveBeenCalledTimes(1);
  act(() => tree.unmount());
});

it.each([{ busy: true }])(
  'disables managed field choices while the SDK is busy (%j)',
  (state) => {
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(
        <HostIntegrationPanel {...integrationProps} {...state} isDark={false} />
      );
    });
    for (const field of ['username', 'biography', 'profilePicture']) {
      const toggle = tree.root.findByProps({
        testID: `host-integration-managed-${field}-switch`,
      });
      expect(toggle.props.disabled).toBe(true);
      expect(toggle.props.onValueChange).toBeUndefined();
    }
    expect(
      tree.root.findByProps({ testID: 'host-integration-restart' }).props
        .disabled
    ).toBe(state.busy);
    act(() => tree.unmount());
  }
);

it('edits the avatar from last host values and submits a trimmed valid URL', () => {
  const onSave = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <EditProfileScreen
        isDark={false}
        user={{
          userId: 'demo',
          profile: {
            username: 'Demo',
            profilePicture: 'https://example.com/old.png',
          },
        }}
        appManagedFields={['profilePicture']}
        fieldToEdit={null}
        canSave
        busy={false}
        error={null}
        onSave={onSave}
      />
    );
  });
  const input = () =>
    tree.root.findByProps({ testID: 'host-edit-profile-avatar' });
  const save = () =>
    tree.root.findByProps({ testID: 'host-edit-profile-save' });
  expect(input().props.value).toBe('https://example.com/old.png');
  expect(
    tree.root.findByProps({ testID: 'host-edit-profile-nickname-readonly' })
      .props.children
  ).toBe('Demo');
  expect(
    tree.root.findByProps({ testID: 'host-edit-profile-bio-readonly' }).props
      .children
  ).toBe('Not supplied');
  expect(tree.root.findAllByType('TextInput' as never)).toHaveLength(1);
  expect(save().props.fullWidth).toBe(true);
  expect(save().props.minHeight).toBe(52);
  act(() => input().props.onChangeText('invalid'));
  expect(save().props.disabled).toBe(true);
  act(() => input().props.onChangeText(' https://example.com/new.png '));
  expect(save().props.disabled).toBe(false);
  act(() => save().props.onPress());
  expect(onSave).toHaveBeenCalledWith({
    profilePicture: 'https://example.com/new.png',
  });
  act(() => tree.unmount());
});

it('disables sign-in without a configured token and keeps a failure visible for retry', () => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <SignInScreen
        isDark
        userId="demo"
        hasSsoUser={false}
        busy={false}
        error="Connection refused"
        onConnect={jest.fn()}
      />
    );
  });
  expect(
    tree.root.findByProps({ testID: 'host-sign-in-connect' }).props.disabled
  ).toBe(true);
  expect(
    tree.root.findByProps({ testID: 'host-sign-in-error' }).props.children
  ).toBe('Connection refused');
  act(() => tree.unmount());
});
