package app.xzone.push;

public class PushPayload {

    private String type  = "notification";
    private String title = "X—ZONE";
    private String body;
    private String url   = "/";
    private String id;

    public PushPayload() {}

    public PushPayload(String type, String body, String url, String id) {
        this.type = type;
        this.body = body;
        this.url  = url;
        this.id   = id;
    }

    // Getters / Setters
    public String getType()               { return type;  }
    public void   setType(String type)    { this.type = type; }
    public String getTitle()              { return title; }
    public void   setTitle(String title)  { this.title = title; }
    public String getBody()               { return body;  }
    public void   setBody(String body)    { this.body = body; }
    public String getUrl()                { return url;   }
    public void   setUrl(String url)      { this.url = url; }
    public String getId()                 { return id;    }
    public void   setId(String id)        { this.id = id; }
}
