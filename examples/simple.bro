# Small SaaS — single region, web + api + data, one third-party.

actor user "User"
github gh "GitHub" "CI/CD"
stripe stripe "Stripe" "Payments"

region aws:eu-west-1 "Production" {
  addon "CloudTrail" [slug: aws:cloudtrail]

  vpc "VPC" {
    subnet.public "Public" {
      service lb "Load Balancer"
    }
    subnet.private "App" {
      nextjs web "Web"
      service api "API"
    }
    subnet.private "Data" {
      db postgres "PostgreSQL"
      redis cache "Redis"
    }
  }
}

edge user -> lb
edge lb -> web
edge web -> api
edge api -> postgres
edge api -> cache
edge api -> stripe [label: charges]
edge gh -> lb [label: deploy]
