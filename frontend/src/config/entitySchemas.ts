export type FieldType = 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'textarea'

export interface FieldSchema {
  key: string
  label: string
  type: FieldType
  options?: string[]
  readOnly?: boolean
}

export interface EntitySchema {
  key: string
  title: string
  apiPath: string
  columns: FieldSchema[]
  formFields: FieldSchema[]
}

export const entitySchemas: Record<string, EntitySchema> = {
  'membership-types': {
    key: 'membership-types',
    title: 'Membership Types',
    apiPath: '/api/membership-types',
    columns: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'duration_days', label: 'Duration (days)', type: 'number' },
      { key: 'price', label: 'Price', type: 'number' },
      { key: 'description', label: 'Description', type: 'text' },
    ],
    formFields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'duration_days', label: 'Duration (days)', type: 'number' },
      { key: 'price', label: 'Price', type: 'number' },
      { key: 'description', label: 'Description', type: 'textarea' },
    ],
  },
  branches: {
    key: 'branches',
    title: 'Branches',
    apiPath: '/api/branches',
    columns: [
      { key: 'code', label: 'Code', type: 'text' },
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'address', label: 'Address', type: 'text' },
      { key: 'phone', label: 'Phone', type: 'text' },
    ],
    formFields: [
      { key: 'code', label: 'Code', type: 'text' },
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'address', label: 'Address', type: 'text' },
      { key: 'phone', label: 'Phone', type: 'text' },
    ],
  },
  walkins: {
    key: 'walkins',
    title: 'Walk-ins',
    apiPath: '/api/walkins',
    columns: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'time', label: 'Time', type: 'text' },
      { key: 'purpose', label: 'Purpose', type: 'text' },
      { key: 'status', label: 'Status', type: 'text' },
      { key: 'converted', label: 'Converted', type: 'checkbox' },
    ],
    formFields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'time', label: 'Time', type: 'text' },
      { key: 'purpose', label: 'Purpose', type: 'text' },
      { key: 'status', label: 'Status', type: 'text' },
      { key: 'converted', label: 'Converted', type: 'checkbox' },
    ],
  },
  promotions: {
    key: 'promotions',
    title: 'Promotions',
    apiPath: '/api/promotions',
    columns: [
      { key: 'promotion_code', label: 'Code', type: 'text' },
      { key: 'promotion_name', label: 'Name', type: 'text' },
      { key: 'base_duration_value', label: 'Base Duration', type: 'number' },
      { key: 'base_duration_unit', label: 'Base Unit', type: 'text' },
      { key: 'extra_duration_value', label: 'Bonus Duration', type: 'number' },
      { key: 'extra_duration_unit', label: 'Bonus Unit', type: 'text' },
      { key: 'package_price', label: 'Price', type: 'number' },
      { key: 'usage_limit', label: 'Usage Limit', type: 'number' },
      { key: 'used_count', label: 'Used', type: 'number', readOnly: true },
      { key: 'status', label: 'Status', type: 'text' },
    ],
    formFields: [
      { key: 'promotion_code', label: 'Code', type: 'text' },
      { key: 'promotion_name', label: 'Name', type: 'text' },
      { key: 'base_duration_value', label: 'Base Duration', type: 'number' },
      {
        key: 'base_duration_unit',
        label: 'Base Unit',
        type: 'select',
        options: ['days', 'months', 'years'],
      },
      { key: 'extra_duration_value', label: 'Bonus Duration', type: 'number' },
      {
        key: 'extra_duration_unit',
        label: 'Bonus Unit',
        type: 'select',
        options: ['days', 'months', 'years'],
      },
      { key: 'package_price', label: 'Price', type: 'number' },
      { key: 'applicable_membership_type', label: 'Applicable Membership', type: 'text' },
      { key: 'usage_limit', label: 'Usage Limit', type: 'number' },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: ['Active', 'Inactive', 'Expired'],
      },
      { key: 'start_date', label: 'Start Date', type: 'date' },
      { key: 'end_date', label: 'End Date', type: 'date' },
    ],
  },
  reports: {
    key: 'reports',
    title: 'Saved Reports',
    apiPath: '/api/reports',
    columns: [
      { key: 'type', label: 'Type', type: 'text' },
      { key: 'period_start', label: 'Period Start', type: 'date' },
      { key: 'period_end', label: 'Period End', type: 'date' },
      { key: 'generated_at', label: 'Generated At', type: 'text', readOnly: true },
    ],
    formFields: [
      { key: 'type', label: 'Type', type: 'text' },
      { key: 'period_start', label: 'Period Start', type: 'date' },
      { key: 'period_end', label: 'Period End', type: 'date' },
      { key: 'data', label: 'Data', type: 'textarea' },
    ],
  },
}
