actor user "End User"
actor developer "Developer" "Tailscale"
github gh "GitHub"

cloudflare cf "Cloudflare" "DNS + WAF + CDN"
stripe stripe "Stripe" "Billing"
posthog ph "PostHog" "Product analytics"
intercom ic "Intercom" "Support chat"
datadog dd "Datadog" "Logs + metrics + traces"

region aws:eu-west-1 "EU Production (single-region SaaS)" {
  addon "CloudTrail" [slug: aws:cloudtrail]
  addon "GuardDuty" [slug: aws:guardduty]
  addon "Inspector" [slug: aws:inspector]

  vpc "VPC" {
    subnet.public "Edge / Public" {
      nextjs web "Next.js Web" "RSC + API routes"
      service api "Core API" "REST + Webhooks"
      service ws "Realtime Gateway" "WebSockets"
      group workers "Async Workers" {
        service mailer "Email Worker"
        service billing "Billing Worker"
        service sync "Sync Worker"
      }
    }
    subnet.private "Data" {
      db postgres "Postgres" "Primary"
      redis cache "Redis" "Sessions + rate limits"
      s3 blobs "S3" "User uploads"
    }
    subnet.private "Platform" {
      keycloak kc "Keycloak" "OIDC / SSO"
      coolify deploy "Coolify" "App deploys"
    }
  }
}

# Traffic + auth
edge user -> cf
edge cf -> web
edge web -> kc [label: login]
edge web -> api
edge web -> ws [label: realtime]

# Data + async
edge api -> postgres
edge api -> cache
edge api -> blobs
edge api -> workers [label: enqueue]
edge ws -> cache

# Deploy + observability + business tools
edge gh -> deploy [label: CI/CD]
edge api -> dd
edge web -> ph
edge web -> ic
edge api -> stripe [label: webhooks]
