// The fixed Glovo-style stages of a billboard campaign, in delivery order.
// Mirrors App\Enums\CampaignStage on the backend.

export const CAMPAIGN_STAGES = [
  {
    value: 'agent_contact',
    label: 'Agent in touch',
    description: 'Your account manager reaches out to kick things off',
  },
  {
    value: 'artwork',
    label: 'Artwork & design',
    description: 'The creative is designed and shared with you',
  },
  {
    value: 'production',
    label: 'Production go-ahead',
    description: 'You approve, then the billboard is printed & built',
  },
  {
    value: 'installation',
    label: 'Installed & live',
    description: 'Your campaign goes up — with photos from the site',
  },
];

export function stageIndex(stage) {
  return CAMPAIGN_STAGES.findIndex((item) => item.value === stage);
}

export function stageLabel(stage) {
  return CAMPAIGN_STAGES.find((item) => item.value === stage)?.label || stage;
}

/** The furthest stage any update has reached; -1 when there are no updates. */
export function currentStageIndex(updates) {
  return updates.reduce((max, update) => Math.max(max, stageIndex(update.stage)), -1);
}
