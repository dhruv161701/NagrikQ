import React from 'react';
import { Badge } from './Badge';
import type { ApplicationStatus, QueueStatus, DocumentVerificationStatus, ChangeRequestStatus } from '../../types';

export interface StatusBadgeProps {
  status: ApplicationStatus | QueueStatus | DocumentVerificationStatus | ChangeRequestStatus | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  let label = status;
  let variant: 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'neutral' = 'neutral';

  switch (status) {
    case 'SUBMITTED':
      label = 'Submitted';
      variant = 'blue';
      break;
    case 'UNDER_REVIEW':
      label = 'Under Review';
      variant = 'purple';
      break;
    case 'ACTION_REQUIRED':
      label = 'Action Required';
      variant = 'orange';
      break;
    case 'APPROVED':
      label = 'Approved';
      variant = 'green';
      break;
    case 'REJECTED':
      label = 'Rejected';
      variant = 'red';
      break;
    case 'COMPLETED':
      label = 'Completed';
      variant = 'green';
      break;

    case 'WAITING':
      label = 'Waiting in Queue';
      variant = 'blue';
      break;
    case 'CALLED':
      label = 'Called to Counter';
      variant = 'orange';
      break;
    case 'CHECKED_IN':
      label = 'Checked In';
      variant = 'blue';
      break;
    case 'IN_SERVICE':
      label = 'Being Served';
      variant = 'purple';
      break;
    case 'NO_SHOW':
      label = 'No Show / Skipped';
      variant = 'red';
      break;
    case 'CANCELLED':
      label = 'Cancelled';
      variant = 'neutral';
      break;

    case 'PENDING':
      label = 'Pending Review';
      variant = 'orange';
      break;
    case 'VERIFIED':
      label = 'Verified ✓';
      variant = 'green';
      break;
    case 'NEEDS_CORRECTION':
      label = 'Needs Correction';
      variant = 'orange';
      break;
  }

  return <Badge variant={variant}>{label}</Badge>;
};
