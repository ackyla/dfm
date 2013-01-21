# -*- coding: utf-8 -*-
require 'sinatra/base'
require 'fb_graph'
require 'json'
require 'RMagick'
require 'base64'
require 'securerandom'

class DfmApp < Sinatra::Base

  configure do
    APP_KEY, APP_SECRET = File.open(".key").read.split
  end

  use Rack::Session::Cookie,
  #:key => 'dfm.session',
  #:domain => 't-forget.me',
  #:path => '/',
  :expire_after => 3600,
  :secret => 'hogehoge'

  error do
    "sorry"
  end
  
  not_found do
    "404"
  end

  get '/' do
    @page_name = ""
    erb :index
  end

  get '/session' do
    session[:session_id]
    #"#{session[:token]}\n#{session.empty?}"
  end

  get '/edit' do
    # セッションのチェック
    if session[:token].nil?
      redirect '/auth'
    end

    @page_name = "写真作成 | "
    erb :edit
  end
  
  #facebook認証
  get '/auth' do
    auth = FbGraph::Auth.new APP_KEY, APP_SECRET, :redirect_uri => "#{request.scheme}://#{request.host}:#{request.port}/auth/callback"
    redirect auth.client.authorization_uri(:scope => [:user_photos, :friends_photos, :photo_upload])
  end

  #facebook認証のコールバック
  get '/auth/callback' do
    #facebookからのcodeが無かったらトップに戻る
    if params[:code].nil?
      redirect '/'
    end

    #codeをセット
    auth = FbGraph::Auth.new APP_KEY, APP_SECRET, :redirect_uri => "#{request.scheme}://#{request.host}:#{request.port}/auth/callback"
    client = auth.client
    client.authorization_code = params[:code]
    
    #アクセストークンを取得
    begin
      access_token = client.access_token! :client_auth_body
      session[:token] = access_token.access_token
      #画像生成用のディレクトリを生成
      session_id = session[:session_id]
      path = "./public/files/#{session_id}"
      FileUtils.mkdir_p(path) unless FileTest.exist?(path)
    rescue
      redirect '/'
    end

    redirect '/edit'
  end

  #友達リストを取得
  get '/friends.json' do
    user = FbGraph::User.me(session[:token]).fetch({"locale" => "ja_JP"})
    friends = user.friends({"locale" => "ja_JP"})
    content_type :json
    friends.to_a.map{|friend|
      {
        "id" => friend.identifier,
        "name" => friend.name, 
        "picture" => friend.picture({"&width=" => "34", "&height=" => "34"}),
      }
    }.to_json
  end

  #アルバムリストを取得
  get '/albums.json' do
    user = FbGraph::User.me(session[:token]).fetch({"locale" => "ja_JP"})
    tagged = user.photos({"type" => "tagged", "limit" => 1})[0].source
    albums = user.albums({"locale" => "ja_JP"})
    albums = albums.to_a.map{|album|
      {
        "id" => album.identifier,
        "name" => album.name,
        "source" => album.cover_photo.nil? ? nil : album.cover_photo.fetch(:access_token => session[:token]).source,
        "tags" => Array::new
      }
    }
    albums.unshift({"id" => 0, "name" => "あなたが写っている写真", "source" => tagged, "tags" => Array::new})
    content_type :json
    albums.to_json
  end

  #自分のタグが付いた写真を取得
  get '/tagged_photos.json' do
    user = FbGraph::User.me(session[:token]).fetch({"locale" => "ja_JP"})
    photos = user.photos({"type" => "tagged"})
    photos = photos.to_a.map{|photo|
      {
        "id" => photo.identifier,
        "name" => photo.name.nil? ? "無題" : photo.name,
        "source" => photo.source,
        "tags" => photo.tags.to_a.map{|tag|
          {
            "id" => tag.user.identifier
          }
        }
      }
    }
    content_type :json
    photos.to_json
  end

  get '/absence.json' do
    id = params[:id]
    user = FbGraph::User.new(id, :access_token => session[:token]).fetch({"fields" => "picture.width(100).height(120)"})
    fb_url = user.raw_attributes["picture"]["data"]["url"]
    session_id = session[:session_id]
    filename = SecureRandom.hex(16)
    url = "/files/#{session_id}/#{filename}.png"
    dir = "./public#{url}"

    begin
      absence = Magick::ImageList.new(fb_url)
      mask = Magick::ImageList.new("./masks/mask_oval.png")
      mask.alpha = Magick::ActivateAlphaChannel
      masked = mask.composite(absence[0], 0, 0, Magick::SrcInCompositeOp)

=begin
      masked.background_color = "black"
      shadow = masked.shadow(5, 5, 3, 0.4)
      shadowed = shadow.composite(masked, 0, 0, Magick::OverCompositeOp)
=end   

      masked.write(dir)
      
      picture = {"source" => url}
      content_type :json
      picture.to_json
    rescue => exc
      content_type :json
      exc.to_json
    end
  end

  #写真サムネイルを取得
  get '/photos.json' do
    id = params[:id]
    album = FbGraph::Album.new(id, :access_token => session[:token]).fetch

    photos = album.photos.to_a.map{|photo|
      {
        "id" => photo.identifier,
        "name" => photo.name.nil? ? "無題" : photo.name,
        "source" => photo.source,
        "tags" => photo.tags.to_a.map{|tag|
          {
            "id" => tag.user.identifier
          }
        }
      }
    }
    content_type :json
    photos.to_json
  end

  #写真を取得
  post '/photo.json' do
    id = params[:id]
    photo = FbGraph::Photo.new(id, :access_token => session[:token]).fetch
    session_id = session[:session_id]

    fb_url = photo.source
    filename = SecureRandom.hex(16)
    url = "/files/#{session_id}/#{filename}.jpg"
    dir = "./public#{url}"
    img = Magick::ImageList.new(fb_url)

    #横幅が800より大きかったら比率維持して縮小
    if(img.columns > 800)
      img = img.resize_to_fit(800, 0)
    end

    img.write(dir)

    res = {
      "source" => url,
      "width" => img.columns,
      "height" => img.rows
    }

    content_type :json
    res.to_json
  end

  post '/closely.json' do
    #既に追加されている欠席者
    absences = params[:absences].nil? ? Array::new : params[:absences]
    #タグ付けされたユーザのID
    tags = params[:tags].nil? ? Array::new : params[:tags]
    #追加する欠席者のID
    id = params[:id]

    #ユーザを取得
    me = FbGraph::User.me(session[:token]).fetch({"locale" => "ja_JP"})

    closely = Hash::new

    mutuals = me.mutual_friends(id).to_a.map{|friend|
      friend.identifier
    }
    
    absences.each{|absence|
      friends = me.mutual_friends(absence)
      friends.each{|friend|
        if(mutuals.include?(friend.identifier))
          if closely["#{friend.identifier}"].nil?
            closely["#{friend.identifier}"] = 1
          else
            closely["#{friend.identifier}"] += 1
          end
        end
      }
    }

    tags.each{|tag|
      friends = me.mutual_friends(tag)
      friends.each{|friend|
        if(mutuals.include?(friend.identifier))
          if closely["#{friend.identifier}"].nil?
            closely["#{friend.identifier}"] = 1
          else
            closely["#{friend.identifier}"] += 1
          end
        end
      }
    }

    content_type :json
    closely.to_json
  end

  post '/create' do
    photo = Magick::ImageList.new("./public#{params[:photo]}")
    absences = params[:absence]

    tags = Array::new
    for i in 0..(absences["x"].size-1)
      absence = Magick::ImageList.new("./public#{absences["src"][i]}")
      photo = photo.composite(absence, absences["x"][i].to_i, absences["y"][i].to_i, Magick::OverCompositeOp)
      tags.append({"name" => i, "x" => absences["x"][i].to_i, "y" => absences["y"][i].to_i})
    end
    
    session_id = session[:session_id]
    filename = SecureRandom.hex(16)
    url = "/files/#{session_id}/photo_#{filename}.jpg"
    dir = "./public#{url}"

    # ディレクトリが無かったら作る
    FileUtils.mkdir_p("./public/files/#{session_id}") unless FileTest.exist?("./public/files/#{session_id}")

    photo.write(dir){
      self.quality = 95
    }

    session[:path] = dir

    json = {
      "path" => url,
      "tags" => tags
    }
    content_type :json
    json.to_json
#    file = File::new(temp.path)
#    album = FbGraph::Album.new("356382514458483", :access_token => session[:token])
#    album.photo!(:source => file)
#    temp.close
  end

  post '/upload' do
    photo = Magick::ImageList.new(session[:path])
    tags = Array::new
    for i in 0..(params[:name].size-1)
      tags.append(FbGraph::Tag.new(:name => "tag-#{params[:name][i]}", :x => params[:x][i].to_f / photo.columns * 100, :y => params[:y][i].to_f / photo.rows * 100))
    end

    message = "#{params[:message]}\n--------------------------------\n休んだ人も写真に入れてあげましょう。\nDon't forget me!!!\n・http://don.t-forget.me\n--------------------------------"

    user = FbGraph::User.me(session[:token]).fetch({"locale" => "ja_JP"})
    user.photo!(:source => File.new(session[:path]), :message => message, :tags => tags)
    
    # ファイルを削除
    File.delete(session[:path]) if File.exist?(session[:path])

  end
end
