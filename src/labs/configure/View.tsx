import type { ConfigureAction, ConfigureSpec } from '../../../schemas/lab.ts';
import type { ConfigureState } from './model.ts';

/** A stripped-down console wizard: native selects and checkboxes, one decision per field (spec 5.1). */
export function ConfigureView(props: {
  spec: ConfigureSpec;
  state: ConfigureState;
  onAction(a: ConfigureAction): void;
}) {
  const { spec, state, onAction } = props;
  return (
    <fieldset class="config">
      <legend class="visually-hidden">Settings</legend>
      {spec.fields.map((field) => {
        const id = `config-${field.id}`;
        const value = state.values[field.id];
        if (field.kind === 'toggle') {
          const checked = value === true;
          return (
            <label key={field.id} class={`option config-toggle${checked ? ' chosen' : ''}`}>
              <input
                id={id}
                type="checkbox"
                checked={checked}
                onChange={(event) =>
                  onAction({ t: 'set', field: field.id, value: event.currentTarget.checked })
                }
              />
              <span class="option-text">{field.label}</span>
            </label>
          );
        }
        const detail = field.options.find((o) => o.id === value)?.detail;
        return (
          <div key={field.id} class="config-field">
            <label for={id}>{field.label}</label>
            <select
              id={id}
              value={typeof value === 'string' ? value : field.initial}
              aria-describedby={detail === undefined ? undefined : `${id}-detail`}
              onChange={(event) => onAction({ t: 'set', field: field.id, value: event.currentTarget.value })}
            >
              {field.options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            {detail !== undefined && (
              <p id={`${id}-detail`} class="muted field-detail">
                {detail}
              </p>
            )}
          </div>
        );
      })}
    </fieldset>
  );
}
