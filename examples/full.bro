# Standard production SaaS — single region, single VPC.
# Edge → app → data, with the usual third-party tools on the side.

actor user "End user"
actor admin "Admin"

github gh "GitHub" "Source + CI/CD"
cloudflare cf "Cloudflare" "DNS + CDN + WAF"

stripe stripe "Stripe" "Payments"
sendgrid mail "SendGrid" "Transactional email"
posthog ph "PostHog" "Product analytics"
intercom ic "Intercom" "Support chat"
datadog dd "Datadog" "Logs + metrics + traces"

region aws:eu-west-1 "Production — eu-west-1" {
  addon "CloudTrail" [slug: aws:cloudtrail]
  addon "GuardDuty" [slug: aws:guardduty]
  addon "Inspector" [slug: aws:inspector]

  vpc "Production VPC" {
    subnet.public "Public" {
      service lb "Load Balancer" "ALB"
    }

    subnet.private "Application" {
      nextjs web "Web" "Next.js — RSC + API routes"
      service api "API" "REST + Webhooks"
      service ws "Realtime" "WebSocket gateway"
      keycloak auth "Keycloak" "OIDC / SSO"

      group workers "Background workers" {
        service mailer "Email worker"
        service billing "Billing worker"
        service jobs "Job runner"
      }
    }

    subnet.private "Data" {
      db postgres "PostgreSQL" "Primary"
      redis cache "Redis" "Cache + queue"
      s3 blobs "S3" "User uploads"
    }
  }
}

# Edge ingress
edge user -> cf
edge admin -> cf
edge cf -> lb
edge lb -> web
edge lb -> api
edge lb -> ws

# App
edge web -> api
edge web -> auth [label: login]
edge api -> auth [label: verify]

# Data
edge api -> postgres
edge api -> cache
edge api -> blobs
edge ws -> cache
edge api -> workers [label: enqueue]
edge workers -> postgres
edge workers -> cache

# Async side-effects
edge mailer -> mail
edge billing -> stripe
edge stripe -> api [label: webhooks]

# Deploys
edge gh -> lb [label: CI/CD]

# Observability + product tools
edge web -> ph
edge web -> ic
edge api -> dd
edge workers -> dd
