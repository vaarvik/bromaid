region aws:eu-north-1 "AWS EU-NORTH-1" {
  addon "CloudTrail" [slug: aws:cloudtrail]
  addon "GuardDuty" [slug: aws:guardduty]

  vpc "VPC 1N" {
    subnet.public "Public" {
      proxy "Proxy → EU-Central"
      router "Router North"
    }
    subnet.private "Private" {
      db tenants "EU Tenant DBs"
      db core "EU Core DB"
    }
  }
}

actor developer "Developer" "Tailscale VPN"
actor github "GitHub"

edge developer -> proxy
edge github -> proxy [label: CICD]
edge proxy -> tenants
edge router -> core
