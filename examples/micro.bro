actor user "User"
actor admin "Admin"

region aws:eu-west-1 "AWS EU-WEST-1" {
  addon "CloudTrail" [slug: aws:cloudtrail]
  addon "Inspector" [slug: aws:inspector]

  vpc "Production VPC" {
    subnet.public "Public" {
      lb "Load Balancer"
      gateway "API Gateway"
    }
    subnet.private "Services" {
      auth "Auth Service"
      orders "Orders Service"
      payments "Payments Service"
      notifications "Notifications"
    }
    subnet.private "Data" {
      db users-db "Users DB"
      db orders-db "Orders DB"
      cache "Redis Cache"
    }
  }
}

external stripe "Stripe"
external sendgrid "SendGrid"
external datadog "Datadog"

edge user -> lb
edge admin -> lb
edge lb -> gateway
edge gateway -> auth
edge gateway -> orders
edge gateway -> payments
edge auth -> users-db
edge orders -> orders-db
edge orders -> cache
edge orders -> notifications
edge payments -> stripe
edge notifications -> sendgrid
edge orders -> datadog
edge payments -> datadog
