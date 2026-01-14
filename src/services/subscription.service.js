exports.computeSubscription = (subscription) => {
  const now = new Date();

  if (!subscription || subscription.status === "NOT_SUBSCRIBED") {
    return {
      plan: null,
      status: "NOT_SUBSCRIBED",
    };
  }

  if (
    subscription.status === "TRIALING" &&
    subscription.trialEnd > now
  ) {
    return { ...subscription, computedStatus: "TRIALING" };
  }

  if (
    subscription.status === "TRIALING" &&
    subscription.trialEnd <= now
  ) {
    return { ...subscription, computedStatus: "ACTIVE" };
  }

  if (
    subscription.status === "ACTIVE" &&
    subscription.currentPeriodEnd < now
  ) {
    return { ...subscription, computedStatus: "EXPIRED" };
  }

  return { ...subscription, computedStatus: subscription.status };
};
